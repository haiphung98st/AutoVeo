namespace AutoVeo.Application.DTOs.Prompts;

public class GeneratePromptRequest
{
    public string? Character { get; set; }
    public string? Theme { get; set; }
    public string Style { get; set; } = "Cinematic";
    public string? SceneDetail { get; set; }
    public string Duration { get; set; } = "8s";
    public string PlatformTarget { get; set; } = "TikTok";
    public Guid? SourceTrendId { get; set; }
}

public class SeriesPromptResponse
{
    public List<PromptResponse> Prompts { get; set; } = new();
    public string MasterCharacter { get; set; } = string.Empty;
    public string MasterTheme { get; set; } = string.Empty;
}

public class GenerateConsistentSeriesRequest
{
    public string Keyword { get; set; } = string.Empty;
    public int Count { get; set; } = 3;
    public string? CharacterStyle { get; set; }
    public string? VisualTheme { get; set; }
    public string Style { get; set; } = "Cinematic";
    public string Duration { get; set; } = "8s";
    public string PlatformTarget { get; set; } = "TikTok";
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
