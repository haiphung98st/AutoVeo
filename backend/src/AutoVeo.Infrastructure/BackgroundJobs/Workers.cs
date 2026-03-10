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
/// Background worker that polls pending Veo3 render jobs for completion.
/// </summary>
public class RenderPollerWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RenderPollerWorker> _logger;
    private readonly IConfiguration _config;

    public RenderPollerWorker(IServiceScopeFactory scopeFactory, ILogger<RenderPollerWorker> logger, IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RenderPollerWorker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PollPendingRendersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RenderPollerWorker encountered an error");
            }

            var intervalSeconds = int.Parse(_config["Veo3:PollIntervalSeconds"] ?? "10");
            await Task.Delay(TimeSpan.FromSeconds(intervalSeconds), stoppingToken);
        }
    }

    private async Task PollPendingRendersAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoVeoDbContext>();
        var veo3 = scope.ServiceProvider.GetRequiredService<IVeo3Connector>();

        var pendingRenders = await db.RenderRequests
            .Include(r => r.Result)
            .Where(r => r.Status == RenderStatus.Processing && r.ExternalJobId != null)
            .ToListAsync(ct);

        foreach (var render in pendingRenders)
        {
            try
            {
                var status = await veo3.GetJobStatusAsync(render.ExternalJobId!);

                if (status.Status == "completed" && status.VideoUrl != null)
                {
                    render.Status = RenderStatus.Completed;
                    render.CompletedAt = DateTime.UtcNow;

                    var result = render.Result ?? new RenderResult { RenderRequestId = render.Id };
                    result.VideoUrl = status.VideoUrl;
                    result.ThumbnailUrl = status.ThumbnailUrl;
                    result.DurationSeconds = status.DurationSeconds ?? 0;
                    result.CompletedAt = DateTime.UtcNow;

                    if (render.Result == null) db.RenderResults.Add(result);

                    _logger.LogInformation("Render {Id} completed with video URL: {Url}", render.Id, status.VideoUrl);
                }
                else if (status.Status == "failed")
                {
                    render.Status = RenderStatus.Failed;
                    render.CompletedAt = DateTime.UtcNow;

                    var result = render.Result ?? new RenderResult { RenderRequestId = render.Id };
                    result.ErrorMessage = status.ErrorMessage ?? "Generation failed";
                    if (render.Result == null) db.RenderResults.Add(result);

                    _logger.LogWarning("Render {Id} failed: {Error}", render.Id, status.ErrorMessage);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to poll render {Id}", render.Id);
            }
        }

        if (pendingRenders.Count > 0)
            await db.SaveChangesAsync(ct);
    }
}
