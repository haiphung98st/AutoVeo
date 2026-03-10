namespace AutoVeo.Application.DTOs.Render;

public class SubmitRenderRequest
{
    public Guid PromptId { get; set; }
    public string? PromptText { get; set; }          // Alternative: pass raw prompt text
    public string AspectRatio { get; set; } = "9:16";
    public string? StyleOverride { get; set; }
}

public class RenderStatusResponse
{
    public Guid RenderRequestId { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<string> Logs { get; set; } = new();
    public string? VideoUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int? DurationSeconds { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
}
