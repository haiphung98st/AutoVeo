namespace AutoVeo.Domain.Entities;

public class TrendSource
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;       // YouTube, TikTok, GoogleTrends
    public string Slug { get; set; } = string.Empty;       // youtube, tiktok, google-trends
    public string? ApiBaseUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Trend> Trends { get; set; } = new List<Trend>();
}
