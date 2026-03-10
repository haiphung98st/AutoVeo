using AutoVeo.Application.DTOs.Render;
using AutoVeo.Application.Interfaces;
using AutoVeo.Domain.Entities;
using AutoVeo.Infrastructure.Data;
using AutoVeo.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AutoVeo.Infrastructure.Services;

public class RenderService : IRenderService
{
    private readonly AutoVeoDbContext _db;
    private readonly IVeo3Connector _veo3;
    private readonly ILogger<RenderService> _logger;

    public RenderService(AutoVeoDbContext db, IVeo3Connector veo3, ILogger<RenderService> logger)
    {
        _db = db;
        _veo3 = veo3;
        _logger = logger;
    }

    public async Task<RenderStatusResponse> SubmitRenderAsync(Guid userId, SubmitRenderRequest request)
    {
        // Resolve prompt text
        string promptText;
        Guid promptId = request.PromptId;

        if (promptId != Guid.Empty)
        {
            var prompt = await _db.GeneratedPrompts.FirstOrDefaultAsync(p => p.Id == promptId && p.UserId == userId);
            if (prompt == null) throw new NotFoundException("Prompt", promptId);
            promptText = prompt.PromptText;
        }
        else if (!string.IsNullOrWhiteSpace(request.PromptText))
        {
            // Create an ad-hoc prompt record
            var adhocPrompt = new GeneratedPrompt
            {
                UserId = userId,
                PromptText = request.PromptText,
                Duration = "10s",
                PlatformTarget = "TikTok"
            };
            _db.GeneratedPrompts.Add(adhocPrompt);
            promptId = adhocPrompt.Id;
            promptText = request.PromptText;
        }
        else
        {
            throw new AppException("Either PromptId or PromptText must be provided.");
        }

        // Create render request
        var renderRequest = new RenderRequest
        {
            UserId = userId,
            PromptId = promptId,
            AspectRatio = request.AspectRatio,
            StyleOverride = request.StyleOverride,
            Status = RenderStatus.Pending
        };

        _db.RenderRequests.Add(renderRequest);
        await _db.SaveChangesAsync();

        // Submit to Veo3
        try
        {
            var submitResult = await _veo3.SubmitPromptAsync(promptText, request.AspectRatio, request.StyleOverride);
            if (submitResult.Success && submitResult.JobId != null)
            {
                renderRequest.ExternalJobId = submitResult.JobId;
                renderRequest.Status = RenderStatus.Processing;
            }
            else
            {
                renderRequest.Status = RenderStatus.Failed;
                var result = new RenderResult
                {
                    RenderRequestId = renderRequest.Id,
                    ErrorMessage = submitResult.ErrorMessage ?? "Failed to submit to Veo3"
                };
                _db.RenderResults.Add(result);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to submit render request {Id} to Veo3", renderRequest.Id);
            renderRequest.Status = RenderStatus.Failed;
            var result = new RenderResult
            {
                RenderRequestId = renderRequest.Id,
                ErrorMessage = $"Veo3 submission error: {ex.Message}"
            };
            _db.RenderResults.Add(result);
        }

        await _db.SaveChangesAsync();

        return MapToResponse(renderRequest);
    }

    public async Task<RenderStatusResponse> GetRenderStatusAsync(Guid userId, Guid renderRequestId)
    {
        var renderRequest = await _db.RenderRequests
            .Include(r => r.Result)
            .FirstOrDefaultAsync(r => r.Id == renderRequestId && r.UserId == userId);

        if (renderRequest == null)
            throw new NotFoundException("RenderRequest", renderRequestId);

        // If still processing and has external job, poll Veo3
        if (renderRequest.Status == RenderStatus.Processing && renderRequest.ExternalJobId != null)
        {
            try
            {
                var jobStatus = await _veo3.GetJobStatusAsync(renderRequest.ExternalJobId);
                if (jobStatus.Status == "completed" && jobStatus.VideoUrl != null)
                {
                    renderRequest.Status = RenderStatus.Completed;
                    renderRequest.CompletedAt = DateTime.UtcNow;

                    var result = renderRequest.Result ?? new RenderResult { RenderRequestId = renderRequest.Id };
                    result.VideoUrl = jobStatus.VideoUrl;
                    result.ThumbnailUrl = jobStatus.ThumbnailUrl;
                    result.DurationSeconds = jobStatus.DurationSeconds ?? 0;
                    result.CompletedAt = DateTime.UtcNow;

                    if (renderRequest.Result == null) _db.RenderResults.Add(result);
                    await _db.SaveChangesAsync();
                }
                else if (jobStatus.Status == "failed")
                {
                    renderRequest.Status = RenderStatus.Failed;
                    renderRequest.CompletedAt = DateTime.UtcNow;
                    var result = renderRequest.Result ?? new RenderResult { RenderRequestId = renderRequest.Id };
                    result.ErrorMessage = jobStatus.ErrorMessage;
                    if (renderRequest.Result == null) _db.RenderResults.Add(result);
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to poll Veo3 status for job {JobId}", renderRequest.ExternalJobId);
            }
        }

        return MapToResponse(renderRequest);
    }

    private static RenderStatusResponse MapToResponse(RenderRequest r)
    {
        var logs = new List<string>();
        if (r.Status == RenderStatus.Pending)
            logs.Add("[00:00] Queued for processing...");
        if (r.Status == RenderStatus.Processing)
        {
            logs.AddRange(new[]
            {
                "[00:00] Initializing Veo3 engine...",
                "[00:02] Loading AI models...",
                "[00:05] Analyzing prompt...",
                "[00:08] Generating keyframes...",
                "[00:12] Applying style transformations...",
                "[00:18] Rendering video sequences..."
            });
        }
        if (r.Status == RenderStatus.Completed)
        {
            logs.AddRange(new[]
            {
                "[00:00] Initializing Veo3 engine...",
                "[00:02] Loading AI models...",
                "[00:05] Analyzing prompt...",
                "[00:08] Generating keyframes...",
                "[00:12] Applying style transformations...",
                "[00:18] Rendering video sequences...",
                "[00:25] Processing visual effects...",
                $"[00:32] Optimizing for {r.AspectRatio} format...",
                "[00:38] Finalizing output...",
                "[00:42] ✓ Render complete!"
            });
        }
        if (r.Status == RenderStatus.Failed)
            logs.Add($"[ERROR] {r.Result?.ErrorMessage ?? "Render failed"}");

        return new RenderStatusResponse
        {
            RenderRequestId = r.Id,
            Status = r.Status,
            Logs = logs,
            VideoUrl = r.Result?.VideoUrl,
            ThumbnailUrl = r.Result?.ThumbnailUrl,
            DurationSeconds = r.Result?.DurationSeconds,
            SubmittedAt = r.SubmittedAt,
            CompletedAt = r.CompletedAt,
            ErrorMessage = r.Result?.ErrorMessage
        };
    }
}
