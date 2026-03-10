namespace AutoVeo.Domain.Entities;

public class GeneratedPrompt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string? Character { get; set; }
    public string? Theme { get; set; }
    public int? PromptStyleId { get; set; }
    public string? SceneDetail { get; set; }
    public string Duration { get; set; } = "10s";
    public string PlatformTarget { get; set; } = "TikTok";
    public string PromptText { get; set; } = string.Empty;
    public Guid? SourceTrendId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public PromptStyle? PromptStyle { get; set; }
    public Trend? SourceTrend { get; set; }
    public ICollection<RenderRequest> RenderRequests { get; set; } = new List<RenderRequest>();
}
