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

        // Submitting is now delegated to Veo3GenerationWorker.
        // It will pick up requests in Pending state.
        
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

        // Background worker will update the database when Node script completes.
        // We just return the latest DB status.

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
