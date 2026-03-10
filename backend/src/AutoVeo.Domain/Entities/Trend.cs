namespace AutoVeo.Domain.Entities;

public class Trend
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int TrendSourceId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string DeltaPercent { get; set; } = string.Empty;  // e.g. "+245%"
    public string Region { get; set; } = "Global";
    public string? ThumbnailUrl { get; set; }
    public string? ExternalUrl { get; set; }
    public long? ViewCount { get; set; }
    public string? RawData { get; set; }                       // JSON blob from source API
    public DateTime CrawledAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }

    // Navigation
    public TrendSource TrendSource { get; set; } = null!;
}
