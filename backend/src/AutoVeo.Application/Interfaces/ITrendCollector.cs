namespace AutoVeo.Application.Interfaces;

/// <summary>
/// Interface for trend collection adapters (YouTube, TikTok, Google Trends)
/// </summary>
public interface ITrendCollector
{
    string PlatformName { get; }
    Task<List<CollectedTrend>> CollectAsync(string region = "Global", CancellationToken ct = default);
}

public class CollectedTrend
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string DeltaPercent { get; set; } = string.Empty;
    public string Region { get; set; } = "Global";
    public string? ThumbnailUrl { get; set; }
    public string? ExternalUrl { get; set; }
    public long? ViewCount { get; set; }
    public string? RawJson { get; set; }
}
