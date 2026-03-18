using System.Security.Claims;
using AutoVeo.Application.DTOs.Prompts;
using AutoVeo.Application.Interfaces;
using AutoVeo.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AutoVeo.Api.Controllers;

[ApiController]
[Route("api/prompts")]
[Authorize]
[EnableRateLimiting("fixed")]
public class PromptsController : ControllerBase
{
    private readonly IPromptService _promptService;

    public PromptsController(IPromptService promptService)
    {
        _promptService = promptService;
    }

    /// <summary>Generate a new video prompt</summary>
    [HttpPost("generate")]
    public async Task<ActionResult<ApiResponse<PromptResponse>>> Generate([FromBody] GeneratePromptRequest request)
    {
        var userId = GetUserId();
        var result = await _promptService.GeneratePromptAsync(userId, request);
        return StatusCode(201, ApiResponse<PromptResponse>.Ok(result, "Prompt generated"));
    }

    /// <summary>Generate a consistent series of video prompts</summary>
    [HttpPost("generate-series")]
    public async Task<ActionResult<ApiResponse<SeriesPromptResponse>>> GenerateSeries([FromBody] GenerateConsistentSeriesRequest request)
    {
        var userId = GetUserId();
        var result = await _promptService.GenerateConsistentSeriesAsync(userId, request);
        return StatusCode(201, ApiResponse<SeriesPromptResponse>.Ok(result, "Series generated"));
    }

    /// <summary>Get user's prompt history</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<PromptResponse>>>> GetPrompts(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var result = await _promptService.GetUserPromptsAsync(userId, page, pageSize);
        return Ok(result);
    }

    /// <summary>Get a single prompt by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<PromptResponse>>> GetById(Guid id)
    {
        var userId = GetUserId();
        var result = await _promptService.GetPromptByIdAsync(userId, id);
        if (result == null) return NotFound(ApiResponse<PromptResponse>.Fail("Prompt not found"));
        return Ok(ApiResponse<PromptResponse>.Ok(result));
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
