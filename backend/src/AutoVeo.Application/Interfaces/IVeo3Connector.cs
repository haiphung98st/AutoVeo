namespace AutoVeo.Application.Interfaces;

/// <summary>
/// Connector for Google Veo3 (labs.google/flow) video generation API
/// </summary>
public interface IVeo3Connector
{
    /// <summary>Submit a prompt to Veo3 for video generation</summary>
    Task<Veo3SubmitResult> SubmitPromptAsync(string promptText, string aspectRatio, string? styleOverride = null);

    /// <summary>Poll the status of a Veo3 generation job</summary>
    Task<Veo3JobStatus> GetJobStatusAsync(string jobId);
}

public class Veo3SubmitResult
{
    public bool Success { get; set; }
    public string? JobId { get; set; }
    public string? ErrorMessage { get; set; }
}

public class Veo3JobStatus
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;  // pending, processing, completed, failed
    public string? VideoUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int? DurationSeconds { get; set; }
    public string? ErrorMessage { get; set; }
    public double? ProgressPercent { get; set; }
}
