using System.Security.Claims;
using AutoVeo.Application.DTOs.Videos;
using AutoVeo.Application.Interfaces;
using AutoVeo.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AutoVeo.Api.Controllers;

[ApiController]
[Route("api/videos")]
[Authorize]
[EnableRateLimiting("fixed")]
public class VideosController : ControllerBase
{
    private readonly IVideoLibraryService _videoService;

    public VideosController(IVideoLibraryService videoService)
    {
        _videoService = videoService;
    }

    /// <summary>Get user's video library with search and filters</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<VideoDto>>>> GetVideos([FromQuery] VideoQueryParams query)
    {
        var userId = GetUserId();
        var result = await _videoService.GetVideosAsync(userId, query);
        return Ok(result);
    }

    /// <summary>Get a single video by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<VideoDto>>> GetById(Guid id)
    {
        var userId = GetUserId();
        var result = await _videoService.GetVideoByIdAsync(userId, id);
        if (result == null) return NotFound(ApiResponse<VideoDto>.Fail("Video not found"));
        return Ok(ApiResponse<VideoDto>.Ok(result));
    }

    /// <summary>Save a rendered video to the library</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<VideoDto>>> Save([FromBody] SaveVideoRequest request)
    {
        var userId = GetUserId();
        var result = await _videoService.SaveVideoAsync(userId, request);
        return StatusCode(201, ApiResponse<VideoDto>.Ok(result, "Video saved to library"));
    }

    /// <summary>Delete a video from the library</summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(Guid id)
    {
        var userId = GetUserId();
        await _videoService.DeleteVideoAsync(userId, id);
        return Ok(ApiResponse<object>.Ok(null!, "Video deleted"));
    }

    /// <summary>Get dashboard data (stats + recent videos + trending summary)</summary>
    [HttpGet("/api/dashboard")]
    public async Task<ActionResult<ApiResponse<DashboardDto>>> GetDashboard()
    {
        var userId = GetUserId();
        var result = await _videoService.GetDashboardAsync(userId);
        return Ok(ApiResponse<DashboardDto>.Ok(result));
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
