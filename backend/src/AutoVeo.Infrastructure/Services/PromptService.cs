using AutoVeo.Application.DTOs.Prompts;
using AutoVeo.Application.Interfaces;
using AutoVeo.Domain.Entities;
using AutoVeo.Infrastructure.Data;
using AutoVeo.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AutoVeo.Infrastructure.Services;

public class PromptService : IPromptService
{
    private readonly AutoVeoDbContext _db;
    private readonly IAIService _ai;

    public PromptService(AutoVeoDbContext db, IAIService ai)
    {
        _db = db;
        _ai = ai;
    }

    public async Task<PromptResponse> GeneratePromptAsync(Guid userId, GeneratePromptRequest request)
    {
        // Build the prompt text (mirrors the frontend logic from PromptGenerator.tsx)
        var character = string.IsNullOrWhiteSpace(request.Character) ? "a mysterious character" : request.Character;
        var theme = string.IsNullOrWhiteSpace(request.Theme) ? "futuristic adventure" : request.Theme;
        var scene = string.IsNullOrWhiteSpace(request.SceneDetail) ? "dynamic action sequence with vibrant colors" : request.SceneDetail;

        var promptText = $"Create a {request.Duration} {request.Style.ToLower()} video featuring {character}. " +
                         $"Theme: {theme}. Scene: {scene}. " +
                         $"Optimized for {request.PlatformTarget} vertical format with engaging visual effects and smooth transitions.";

        // Resolve style ID
        var style = await _db.PromptStyles.FirstOrDefaultAsync(s => s.Name == request.Style);

        var prompt = new GeneratedPrompt
        {
            UserId = userId,
            Character = request.Character,
            Theme = request.Theme,
            PromptStyleId = style?.Id,
            SceneDetail = request.SceneDetail,
            Duration = request.Duration,
            PlatformTarget = request.PlatformTarget,
            PromptText = promptText,
            SourceTrendId = request.SourceTrendId
        };

        _db.GeneratedPrompts.Add(prompt);
        await _db.SaveChangesAsync();

        return MapToResponse(prompt, request.Style);
    }

    public async Task<SeriesPromptResponse> GenerateConsistentSeriesAsync(Guid userId, GenerateConsistentSeriesRequest request)
    {
        // 1. Generate scenes via AI
        var scenes = await _ai.GenerateConsistentScenesAsync(request.Keyword, request.Count, request.CharacterStyle, request.VisualTheme);

        var firstScene = scenes.FirstOrDefault();
        var masterChar = firstScene?.Character ?? "mysterious character";
        var masterTheme = firstScene?.Theme ?? "futuristic adventure";

        var response = new SeriesPromptResponse
        {
            MasterCharacter = masterChar,
            MasterTheme = masterTheme
        };

        // Create a unique ID for this specific series generation
        var seriesId = Guid.NewGuid();

        // 2. Map scenes to Prompts and Save
        foreach (var scene in scenes)
        {
            var promptText = $"Create a {request.Duration} {request.Style.ToLower()} video featuring {scene.Character}. " +
                             $"Theme: {scene.Theme}. Scene: {scene.SceneDetail}. " +
                             $"Optimized for {request.PlatformTarget} vertical format.";

            var style = await _db.PromptStyles.FirstOrDefaultAsync(s => s.Name == request.Style);

            var prompt = new GeneratedPrompt
            {
                UserId = userId,
                Character = scene.Character,
                Theme = scene.Theme,
                PromptStyleId = style?.Id,
                SceneDetail = scene.SceneDetail,
                Duration = request.Duration,
                PlatformTarget = request.PlatformTarget,
                PromptText = promptText,
                SeriesId = seriesId
            };

            _db.GeneratedPrompts.Add(prompt);
            response.Prompts.Add(MapToResponse(prompt, request.Style));
        }

        await _db.SaveChangesAsync();
        return response;
    }

    public async Task<ApiResponse<List<PromptResponse>>> GetUserPromptsAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        var query = _db.GeneratedPrompts
            .Include(p => p.PromptStyle)
            .Where(p => p.UserId == userId);

        var totalCount = await query.CountAsync();

        var prompts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PromptResponse
            {
                Id = p.Id,
                PromptText = p.PromptText,
                Character = p.Character,
                Theme = p.Theme,
                Style = p.PromptStyle != null ? p.PromptStyle.Name : "Unknown",
                Duration = p.Duration,
                PlatformTarget = p.PlatformTarget,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return ApiResponse<List<PromptResponse>>.Paginated(prompts, page, pageSize, totalCount);
    }

    public async Task<PromptResponse?> GetPromptByIdAsync(Guid userId, Guid promptId)
    {
        return await _db.GeneratedPrompts
            .Include(p => p.PromptStyle)
            .Where(p => p.Id == promptId && p.UserId == userId)
            .Select(p => new PromptResponse
            {
                Id = p.Id,
                PromptText = p.PromptText,
                Character = p.Character,
                Theme = p.Theme,
                Style = p.PromptStyle != null ? p.PromptStyle.Name : "Unknown",
                Duration = p.Duration,
                PlatformTarget = p.PlatformTarget,
                CreatedAt = p.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    private static PromptResponse MapToResponse(GeneratedPrompt p, string styleName) => new()
    {
        Id = p.Id,
        PromptText = p.PromptText,
        Character = p.Character,
        Theme = p.Theme,
        Style = styleName,
        Duration = p.Duration,
        PlatformTarget = p.PlatformTarget,
        CreatedAt = p.CreatedAt
    };
}
