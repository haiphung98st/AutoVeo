namespace AutoVeo.Application.DTOs.Videos;

public class VideoDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string PromptText { get; set; } = string.Empty;
    public string Style { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? VideoUrl { get; set; }
    public string Duration { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class SaveVideoRequest
{
    public Guid? RenderResultId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string PromptText { get; set; } = string.Empty;
    public string Style { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
}

public class VideoQueryParams
{
    public string? Search { get; set; }
    public string? Style { get; set; }
    public string? DateRange { get; set; }   // today, week, month, all
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class DashboardDto
{
    public int TotalVideos { get; set; }
    public int TotalPrompts { get; set; }
    public int PendingRenders { get; set; }
    public List<TrendSummaryItem> TrendingSummary { get; set; } = new();
    public List<VideoDto> RecentVideos { get; set; } = new();
}

public class TrendSummaryItem
{
    public string Title { get; set; } = string.Empty;
    public string Percent { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
}
