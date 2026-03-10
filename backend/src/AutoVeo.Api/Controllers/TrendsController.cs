using AutoVeo.Application.DTOs.Trends;
using AutoVeo.Application.Interfaces;
using AutoVeo.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AutoVeo.Api.Controllers;

[ApiController]
[Route("api/trends")]
[Authorize]
[EnableRateLimiting("fixed")]
public class TrendsController : ControllerBase
{
    private readonly ITrendService _trendService;

    public TrendsController(ITrendService trendService)
    {
        _trendService = trendService;
    }

    /// <summary>Get trends with platform, range, and region filters</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<TrendDto>>>> GetTrends([FromQuery] TrendQueryParams query)
    {
        var result = await _trendService.GetTrendsAsync(query);
        return Ok(result);
    }

    /// <summary>Get top trending summary for dashboard</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<List<TrendSummaryDto>>>> GetSummary([FromQuery] int count = 5)
    {
        var result = await _trendService.GetTrendingSummaryAsync(count);
        return Ok(ApiResponse<List<TrendSummaryDto>>.Ok(result));
    }

    /// <summary>Get a single trend by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<TrendDto>>> GetById(Guid id)
    {
        var result = await _trendService.GetTrendByIdAsync(id);
        if (result == null) return NotFound(ApiResponse<TrendDto>.Fail("Trend not found"));
        return Ok(ApiResponse<TrendDto>.Ok(result));
    }
}
