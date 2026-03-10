using System.Security.Claims;
using AutoVeo.Application.DTOs.Render;
using AutoVeo.Application.Interfaces;
using AutoVeo.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AutoVeo.Api.Controllers;

[ApiController]
[Route("api/render")]
[Authorize]
[EnableRateLimiting("fixed")]
public class RenderController : ControllerBase
{
    private readonly IRenderService _renderService;

    public RenderController(IRenderService renderService)
    {
        _renderService = renderService;
    }

    /// <summary>Submit a prompt for video rendering via Veo3</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<RenderStatusResponse>>> Submit([FromBody] SubmitRenderRequest request)
    {
        var userId = GetUserId();
        var result = await _renderService.SubmitRenderAsync(userId, request);
        return StatusCode(202, ApiResponse<RenderStatusResponse>.Ok(result, "Render submitted"));
    }

    /// <summary>Get render status and logs</summary>
    [HttpGet("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<RenderStatusResponse>>> GetStatus(Guid id)
    {
        var userId = GetUserId();
        var result = await _renderService.GetRenderStatusAsync(userId, id);
        return Ok(ApiResponse<RenderStatusResponse>.Ok(result));
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
