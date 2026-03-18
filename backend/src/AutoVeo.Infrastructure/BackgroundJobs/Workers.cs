using AutoVeo.Application.Interfaces;
using AutoVeo.Domain.Entities;
using AutoVeo.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AutoVeo.Infrastructure.BackgroundJobs;

/// <summary>
/// Background worker that periodically crawls trending topics from all configured platforms.
/// Runs on a configurable interval (default: 60 minutes).
/// </summary>
public class TrendCrawlerWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TrendCrawlerWorker> _logger;
    private readonly IConfiguration _config;

    public TrendCrawlerWorker(IServiceScopeFactory scopeFactory, ILogger<TrendCrawlerWorker> logger, IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("TrendCrawlerWorker started");

        // Initial delay to let the app fully start
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("TrendCrawlerWorker: Starting scheduled crawl...");
                await CrawlAllPlatformsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TrendCrawlerWorker encountered an error");
            }

            var intervalMinutes = int.Parse(_config["TrendCrawler:IntervalMinutes"] ?? "60");
            _logger.LogInformation("TrendCrawlerWorker: Waiting {Minutes} minutes for next crawl...", intervalMinutes);
            await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
        }
    }

    private async Task CrawlAllPlatformsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoVeoDbContext>();
        var collectors = scope.ServiceProvider.GetServices<ITrendCollector>();
        
        // Region mapping for consistent database storage
        var regions = new[] { "Global", "United States", "Vietnam" };

        foreach (var collector in collectors)
        {
            var source = await db.TrendSources.FirstOrDefaultAsync(s => s.Name == collector.PlatformName, ct);
            if (source == null || !source.IsActive) continue;

            foreach (var region in regions)
            {
                try
                {
                    _logger.LogInformation("Crawling {Platform} trends for region {Region}", collector.PlatformName, region);
                    var collectedTrends = await collector.CollectAsync(region, ct);

                    foreach (var item in collectedTrends)
                    {
                        // Upsert: check if trend with same title from same source exists within last 24h
                        var existing = await db.Trends.FirstOrDefaultAsync(
                            t => t.TrendSourceId == source.Id &&
                                 t.Title == item.Title &&
                                 t.Region == item.Region &&
                                 t.CrawledAt > DateTime.UtcNow.AddHours(-24), ct);

                        if (existing != null)
                        {
                            // Update delta
                            existing.DeltaPercent = item.DeltaPercent;
                            existing.ViewCount = item.ViewCount ?? existing.ViewCount;
                            existing.ThumbnailUrl = item.ThumbnailUrl ?? existing.ThumbnailUrl;
                            existing.RawData = item.RawJson ?? existing.RawData;
                        }
                        else
                        {
                            db.Trends.Add(new Trend
                            {
                                TrendSourceId = source.Id,
                                Title = item.Title,
                                Category = item.Category,
                                DeltaPercent = item.DeltaPercent,
                                Region = item.Region,
                                ThumbnailUrl = item.ThumbnailUrl,
                                ExternalUrl = item.ExternalUrl,
                                ViewCount = item.ViewCount,
                                RawData = item.RawJson,
                                ExpiresAt = DateTime.UtcNow.AddDays(7)
                            });
                        }
                    }

                    await db.SaveChangesAsync(ct);
                    _logger.LogInformation("Saved {Count} trends from {Platform} ({Region})",
                        collectedTrends.Count, collector.PlatformName, region);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to crawl {Platform} for region {Region}", collector.PlatformName, region);
                }
            }
        }

        // Cleanup expired trends
        var expired = await db.Trends.Where(t => t.ExpiresAt.HasValue && t.ExpiresAt < DateTime.UtcNow).ToListAsync(ct);
        if (expired.Count > 0)
        {
            db.Trends.RemoveRange(expired);
            await db.SaveChangesAsync(ct);
            _logger.LogInformation("Cleaned up {Count} expired trends", expired.Count);
        }
    }
}

/// <summary>
/// Background worker that executes the local Node.js Playwright script to generate videos via Veo3.
/// Processes one pending render request at a time to prevent Chrome from crashing.
/// </summary>
public class Veo3GenerationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<Veo3GenerationWorker> _logger;
    private readonly IConfiguration _config;
    private readonly Microsoft.AspNetCore.Hosting.IWebHostEnvironment _env;

    public Veo3GenerationWorker(IServiceScopeFactory scopeFactory, ILogger<Veo3GenerationWorker> logger, IConfiguration config, Microsoft.AspNetCore.Hosting.IWebHostEnvironment env)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _config = config;
        _env = env;
    }

    private readonly SemaphoreSlim _concurrencySemaphore = new SemaphoreSlim(3);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Veo3GenerationWorker started with max parallelism: 3");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingRendersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Veo3GenerationWorker encountered an error");
            }

            // Check every 10 seconds for new jobs
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    private async Task ProcessPendingRendersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoVeoDbContext>();

        var pendingRenders = await db.RenderRequests
            .Include(r => r.Prompt)
            .Where(r => r.Status == RenderStatus.Pending)
            .ToListAsync(ct);

        if (pendingRenders.Count == 0) return;

        // Group by SeriesId. If SeriesId is null, each gets its own "series"
        var groups = pendingRenders
            .GroupBy(r => r.Prompt?.SeriesId ?? Guid.NewGuid())
            .ToList();

        _logger.LogInformation("Found {Count} pending renders in {GroupCount} groups.", pendingRenders.Count, groups.Count);

        var tasks = groups.Select(group => ProcessRenderGroupAsync(group.ToList(), ct));
        await Task.WhenAll(tasks);
    }

    private async Task ProcessRenderGroupAsync(List<RenderRequest> renderGroup, CancellationToken ct)
    {
        await _concurrencySemaphore.WaitAsync(ct);
        
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AutoVeoDbContext>();
            
            // Re-fetch to ensure we have the latest and mark as Processing
            var groupIds = renderGroup.Select(r => r.Id).ToList();
            var renders = await db.RenderRequests
                .Include(r => r.Prompt)
                .Where(r => groupIds.Contains(r.Id))
                .ToListAsync(ct);

            foreach (var r in renders) r.Status = RenderStatus.Processing;
            await db.SaveChangesAsync(ct);

            _logger.LogInformation("Processing group of {Count} renders. First ID: {Id}", renders.Count, renders[0].Id);

            // Prepare prompt data for generate.js
            var promptData = renders.Select(r => new { 
                id = r.Id, 
                text = r.Prompt?.PromptText ?? "A cinematic video" 
            }).ToList();
            
            string jsonPrompts = System.Text.Json.JsonSerializer.Serialize(promptData);
            
            string scriptDir = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "..", "automation"));
            string scriptPath = Path.Combine(scriptDir, "generate.js");
            string outputDir = Path.Combine(scriptDir, "output");

            if (!Directory.Exists(outputDir)) Directory.CreateDirectory(outputDir);

            var startInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "node",
                Arguments = $"\"{scriptPath}\" '{jsonPrompts}' \"{outputDir}\"",
                WorkingDirectory = scriptDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = System.Diagnostics.Process.Start(startInfo);
            if (process == null) throw new Exception("Failed to start node process");

            string stdOut = await process.StandardOutput.ReadToEndAsync();
            string stdErr = await process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync(ct);

            _logger.LogInformation("Group process completed. Exit code: {Code}", process.ExitCode);
            
            if (process.ExitCode == 0)
            {
                var lines = stdOut.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var render in renders)
                {
                    // Look for [RESULT][renderId] in output
                    string marker = $"[RESULT][{render.Id}]";
                    string? resultLine = lines.FirstOrDefault(l => l.Contains(marker));
                    
                    if (resultLine != null)
                    {
                        string resultPath = resultLine.Split(marker, StringSplitOptions.TrimEntries).Last().Trim();
                        if (File.Exists(resultPath))
                        {
                            string wwwroot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
                            string videosDir = Path.Combine(wwwroot, "videos");
                            if (!Directory.Exists(videosDir)) Directory.CreateDirectory(videosDir);

                            string fileName = $"{render.Id}.mp4";
                            string destinationPath = Path.Combine(videosDir, fileName);

                            File.Copy(resultPath, destinationPath, true);

                            render.Status = RenderStatus.Completed;
                            render.CompletedAt = DateTime.UtcNow;

                            var result = new RenderResult 
                            { 
                                RenderRequestId = render.Id,
                                VideoUrl = $"/videos/{fileName}",
                                DurationSeconds = 8,
                                CompletedAt = DateTime.UtcNow
                            };
                            db.RenderResults.Add(result);
                        }
                    }
                    else
                    {
                        render.Status = RenderStatus.Failed;
                        db.RenderResults.Add(new RenderResult 
                        { 
                            RenderRequestId = render.Id,
                            ErrorMessage = "Success exit but result path not found in output for this prompt."
                        });
                    }
                }
            }
            else
            {
                foreach (var render in renders)
                {
                    render.Status = RenderStatus.Failed;
                    db.RenderResults.Add(new RenderResult 
                    { 
                        RenderRequestId = render.Id,
                        ErrorMessage = $"Automation script failed with exit code {process.ExitCode}. Error: {stdErr}"
                    });
                }
            }
            
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception in render group processing");
            // Optionally update all in group to failed here
        }
        finally
        {
            _concurrencySemaphore.Release();
        }
    }
}
