namespace AutoVeo.Application.DTOs.Trends;

public class TrendDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string DeltaPercent { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string Platform { get; set; } = string.Empty;
    public DateTime CrawledAt { get; set; }
}

public class TrendQueryParams
{
    public string? Platform { get; set; }       // YouTube, TikTok, GoogleTrends
    public string? Range { get; set; }          // today, 7d, 30d
    public string? Region { get; set; }         // VN, US, Global
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class TrendSummaryDto
{
    public string Title { get; set; } = string.Empty;
    public string Percent { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
}
