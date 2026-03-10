using AutoVeo.Application.DTOs.Render;

namespace AutoVeo.Application.Interfaces;

public interface IRenderService
{
    Task<RenderStatusResponse> SubmitRenderAsync(Guid userId, SubmitRenderRequest request);
    Task<RenderStatusResponse> GetRenderStatusAsync(Guid userId, Guid renderRequestId);
}
