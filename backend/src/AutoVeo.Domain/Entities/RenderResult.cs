namespace AutoVeo.Domain.Entities;

public class RenderResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RenderRequestId { get; set; }
    public string? VideoUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int DurationSeconds { get; set; }
    public long? FileSizeBytes { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public RenderRequest RenderRequest { get; set; } = null!;
}
