namespace AutoVeo.Application.Interfaces;

public interface IAIService
{
    Task<List<AISceneDescriptor>> GenerateConsistentScenesAsync(string keyword, int count, string? characterStyle = null, string? visualTheme = null, CancellationToken ct = default);
}

public class AISceneDescriptor
{
    public string Character { get; set; } = string.Empty;
    public string Theme { get; set; } = string.Empty;
    public string SceneDetail { get; set; } = string.Empty;
}
