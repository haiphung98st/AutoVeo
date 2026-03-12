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
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CrawlAllPlatformsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TrendCrawlerWorker encountered an error");
            }

            var intervalMinutes = int.Parse(_config["TrendCrawler:IntervalMinutes"] ?? "60");
            await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
        }
    }

    private async Task CrawlAllPlatformsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoVeoDbContext>();
        var collectors = scope.ServiceProvider.GetServices<ITrendCollector>();
        var regions = new[] { "Global", "VN", "US" };

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

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Veo3GenerationWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessNextPendingRenderAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Veo3GenerationWorker encountered an error");
            }

            // Check every 10 seconds for new jobs
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    private async Task ProcessNextPendingRenderAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoVeoDbContext>();

        // We only process one request at a time to save memory/Chrome instances
        var render = await db.RenderRequests
            .Include(r => r.Prompt)
            .FirstOrDefaultAsync(r => r.Status == RenderStatus.Pending, ct);

        if (render == null) return;

        // Set to processing immediately to lock it
        render.Status = RenderStatus.Processing;
        await db.SaveChangesAsync(ct);

        _logger.LogInformation("Starting generation for render {Id}. Prompt: {Prompt}", render.Id, render.Prompt?.PromptText);

        string promptText = render.Prompt?.PromptText ?? "A cinematic video";
        string outputFormat = render.AspectRatio == "16:9" ? "Ngang" : "Dọc"; 
        
        try
        {
            // Prepare paths
            // From src/AutoVeo.Api to AutoVeo root: ../../../
            string scriptDir = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "..", "automation"));
            string scriptPath = Path.Combine(scriptDir, "generate.js");
            string outputDir = Path.Combine(scriptDir, "output");

            if (!Directory.Exists(outputDir))
                Directory.CreateDirectory(outputDir);

            // Setup process
            var startInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "node",
                Arguments = $"\"{scriptPath}\" \"{promptText}\" \"{outputDir}\"",
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

            _logger.LogInformation("Node script completed. Exit code: {Code}\nStdout: {Stdout}", process.ExitCode, stdOut);
            if (!string.IsNullOrEmpty(stdErr))
                _logger.LogWarning("Node script stderr: {Stderr}", stdErr);

            if (process.ExitCode == 0)
            {
                // Parse the [RESULT] path
                string? resultPath = null;
                var lines = stdOut.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var line in lines)
                {
                    if (line.Contains("[RESULT]"))
                    {
                        resultPath = line.Split("[RESULT]", StringSplitOptions.TrimEntries).LastOrDefault();
                        break;
                    }
                }

                if (!string.IsNullOrEmpty(resultPath) && File.Exists(resultPath))
                {
                    // Copy to wwwroot so the frontend can display it
                    string wwwroot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
                    string videosDir = Path.Combine(wwwroot, "videos");
                    if (!Directory.Exists(videosDir)) Directory.CreateDirectory(videosDir);

                    string fileName = $"{render.Id}.mp4";
                    string destinationPath = Path.Combine(videosDir, fileName);

                    File.Copy(resultPath, destinationPath, true);

                    // Update DB with success
                    render.Status = RenderStatus.Completed;
                    render.CompletedAt = DateTime.UtcNow;

                    var result = new RenderResult 
                    { 
                        RenderRequestId = render.Id,
                        VideoUrl = $"/videos/{fileName}",
                        DurationSeconds = 5, // Default for Veo3
                        CompletedAt = DateTime.UtcNow
                    };
                    db.RenderResults.Add(result);

                    _logger.LogInformation("Successfully processed and saved video to {Path}", destinationPath);
                }
                else
                {
                    throw new Exception("Script exited 0 but no valid [RESULT] path found in output.");
                }
            }
            else
            {
                throw new Exception($"Script exited with code {process.ExitCode}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate video for render {Id}", render.Id);
            render.Status = RenderStatus.Failed;
            render.CompletedAt = DateTime.UtcNow;

            var result = new RenderResult 
            { 
                RenderRequestId = render.Id,
                ErrorMessage = ex.Message
            };
            db.RenderResults.Add(result);
        }

        await db.SaveChangesAsync(ct);
    }
}
