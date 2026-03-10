namespace AutoVeo.Application.DTOs.Prompts;

public class GeneratePromptRequest
{
    public string? Character { get; set; }
    public string? Theme { get; set; }
    public string Style { get; set; } = "Cinematic";
    public string? SceneDetail { get; set; }
    public string Duration { get; set; } = "10s";
    public string PlatformTarget { get; set; } = "TikTok";
    public Guid? SourceTrendId { get; set; }
}

public class PromptResponse
{
    public Guid Id { get; set; }
    public string PromptText { get; set; } = string.Empty;
    public string? Character { get; set; }
    public string? Theme { get; set; }
    public string Style { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string PlatformTarget { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
