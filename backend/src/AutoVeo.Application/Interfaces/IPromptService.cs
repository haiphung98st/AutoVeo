using AutoVeo.Application.DTOs.Prompts;
using AutoVeo.Shared.Models;

namespace AutoVeo.Application.Interfaces;

public interface IPromptService
{
    Task<PromptResponse> GeneratePromptAsync(Guid userId, GeneratePromptRequest request);
    Task<SeriesPromptResponse> GenerateConsistentSeriesAsync(Guid userId, GenerateConsistentSeriesRequest request);
    Task<ApiResponse<List<PromptResponse>>> GetUserPromptsAsync(Guid userId, int page = 1, int pageSize = 20);
    Task<PromptResponse?> GetPromptByIdAsync(Guid userId, Guid promptId);
}
