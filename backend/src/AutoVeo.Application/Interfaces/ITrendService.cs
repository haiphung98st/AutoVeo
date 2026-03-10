using AutoVeo.Application.DTOs.Trends;
using AutoVeo.Shared.Models;

namespace AutoVeo.Application.Interfaces;

public interface ITrendService
{
    Task<ApiResponse<List<TrendDto>>> GetTrendsAsync(TrendQueryParams queryParams);
    Task<List<TrendSummaryDto>> GetTrendingSummaryAsync(int count = 5);
    Task<TrendDto?> GetTrendByIdAsync(Guid id);
}
