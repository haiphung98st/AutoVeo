namespace AutoVeo.Domain.Entities;

public class RenderRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid PromptId { get; set; }
    public string AspectRatio { get; set; } = "9:16";       // 9:16, 16:9, 1:1
    public string? StyleOverride { get; set; }
    public string Status { get; set; } = RenderStatus.Pending;
    public string? ExternalJobId { get; set; }               // Veo3 job ID
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public GeneratedPrompt Prompt { get; set; } = null!;
    public RenderResult? Result { get; set; }
}

public static class RenderStatus
{
    public const string Pending = "Pending";
    public const string Processing = "Processing";
    public const string Completed = "Completed";
    public const string Failed = "Failed";
}
