namespace AutoVeo.Domain.Entities;

public class VideoLibraryItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? RenderResultId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string PromptText { get; set; } = string.Empty;
    public string Style { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? VideoUrl { get; set; }
    public string Duration { get; set; } = "0:00";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public RenderResult? RenderResult { get; set; }
    public ICollection<VideoTag> VideoTags { get; set; } = new List<VideoTag>();
}
