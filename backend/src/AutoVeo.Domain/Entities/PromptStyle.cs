namespace AutoVeo.Domain.Entities;

public class PromptStyle
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;        // Cinematic, Anime, Realistic, etc.
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<GeneratedPrompt> Prompts { get; set; } = new List<GeneratedPrompt>();
}
