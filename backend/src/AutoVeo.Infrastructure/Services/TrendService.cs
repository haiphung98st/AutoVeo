using AutoVeo.Application.DTOs.Trends;
using AutoVeo.Application.Interfaces;
using AutoVeo.Infrastructure.Data;
using AutoVeo.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AutoVeo.Infrastructure.Services;

public class TrendService : ITrendService
{
    private readonly AutoVeoDbContext _db;

    public TrendService(AutoVeoDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponse<List<TrendDto>>> GetTrendsAsync(TrendQueryParams q)
    {
        var query = _db.Trends.Include(t => t.TrendSource).AsQueryable();

        // Platform filter
        if (!string.IsNullOrWhiteSpace(q.Platform))
            query = query.Where(t => t.TrendSource.Name == q.Platform);

        // Region filter
        if (!string.IsNullOrWhiteSpace(q.Region) && q.Region != "Global")
            query = query.Where(t => t.Region == q.Region);

        // Time range filter
        if (!string.IsNullOrWhiteSpace(q.Range))
        {
            var since = q.Range.ToLower() switch
            {
                "today" => DateTime.UtcNow.Date,
                "7d" or "7 days" => DateTime.UtcNow.AddDays(-7),
                "30d" or "30 days" => DateTime.UtcNow.AddDays(-30),
                _ => DateTime.MinValue
            };
            if (since != DateTime.MinValue)
                query = query.Where(t => t.CrawledAt >= since);
        }

        var totalCount = await query.CountAsync();

        var trends = await query
            .OrderByDescending(t => t.CrawledAt)
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(t => new TrendDto
            {
                Id = t.Id,
                Title = t.Title,
                Category = t.Category,
                DeltaPercent = t.DeltaPercent,
                Region = t.Region,
                ThumbnailUrl = t.ThumbnailUrl,
                Platform = t.TrendSource.Name,
                CrawledAt = t.CrawledAt
            })
            .ToListAsync();

        return ApiResponse<List<TrendDto>>.Paginated(trends, q.Page, q.PageSize, totalCount);
    }

    public async Task<List<TrendSummaryDto>> GetTrendingSummaryAsync(int count = 5)
    {
        return await _db.Trends
            .OrderByDescending(t => t.CrawledAt)
            .Take(count)
            .Select(t => new TrendSummaryDto
            {
                Title = t.Title,
                Percent = t.DeltaPercent,
                Category = t.Category
            })
            .ToListAsync();
    }

    public async Task<TrendDto?> GetTrendByIdAsync(Guid id)
    {
        return await _db.Trends
            .Include(t => t.TrendSource)
            .Where(t => t.Id == id)
            .Select(t => new TrendDto
            {
                Id = t.Id,
                Title = t.Title,
                Category = t.Category,
                DeltaPercent = t.DeltaPercent,
                Region = t.Region,
                ThumbnailUrl = t.ThumbnailUrl,
                Platform = t.TrendSource.Name,
                CrawledAt = t.CrawledAt
            })
            .FirstOrDefaultAsync();
    }
}
