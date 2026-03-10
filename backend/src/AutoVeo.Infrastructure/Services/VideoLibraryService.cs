using AutoVeo.Application.DTOs.Videos;
using AutoVeo.Application.Interfaces;
using AutoVeo.Domain.Entities;
using AutoVeo.Infrastructure.Data;
using AutoVeo.Shared.Exceptions;
using AutoVeo.Shared.Models;
using Microsoft.EntityFrameworkCore;

namespace AutoVeo.Infrastructure.Services;

public class VideoLibraryService : IVideoLibraryService
{
    private readonly AutoVeoDbContext _db;

    public VideoLibraryService(AutoVeoDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponse<List<VideoDto>>> GetVideosAsync(Guid userId, VideoQueryParams q)
    {
        var query = _db.VideoLibrary
            .Include(v => v.VideoTags).ThenInclude(vt => vt.Tag)
            .Where(v => v.UserId == userId);

        // Search filter
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var search = q.Search.ToLower();
            query = query.Where(v =>
                v.Title.ToLower().Contains(search) ||
                v.PromptText.ToLower().Contains(search) ||
                v.VideoTags.Any(vt => vt.Tag.Name.ToLower().Contains(search)));
        }

        // Style filter
        if (!string.IsNullOrWhiteSpace(q.Style) && q.Style != "All")
            query = query.Where(v => v.Style == q.Style);

        // Date filter
        if (!string.IsNullOrWhiteSpace(q.DateRange) && q.DateRange != "all" && q.DateRange != "All Time")
        {
            var since = q.DateRange.ToLower() switch
            {
                "today" => DateTime.UtcNow.Date,
                "week" or "this week" => DateTime.UtcNow.AddDays(-7),
                "month" or "this month" => DateTime.UtcNow.AddDays(-30),
                _ => DateTime.MinValue
            };
            if (since != DateTime.MinValue)
                query = query.Where(v => v.CreatedAt >= since);
        }

        var totalCount = await query.CountAsync();

        var videos = await query
            .OrderByDescending(v => v.CreatedAt)
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(v => new VideoDto
            {
                Id = v.Id,
                Title = v.Title,
                PromptText = v.PromptText,
                Style = v.Style,
                ThumbnailUrl = v.ThumbnailUrl,
                VideoUrl = v.VideoUrl,
                Duration = v.Duration,
                Tags = v.VideoTags.Select(vt => vt.Tag.Name).ToList(),
                CreatedAt = v.CreatedAt
            })
            .ToListAsync();

        return ApiResponse<List<VideoDto>>.Paginated(videos, q.Page, q.PageSize, totalCount);
    }

    public async Task<VideoDto?> GetVideoByIdAsync(Guid userId, Guid videoId)
    {
        return await _db.VideoLibrary
            .Include(v => v.VideoTags).ThenInclude(vt => vt.Tag)
            .Where(v => v.Id == videoId && v.UserId == userId)
            .Select(v => new VideoDto
            {
                Id = v.Id,
                Title = v.Title,
                PromptText = v.PromptText,
                Style = v.Style,
                ThumbnailUrl = v.ThumbnailUrl,
                VideoUrl = v.VideoUrl,
                Duration = v.Duration,
                Tags = v.VideoTags.Select(vt => vt.Tag.Name).ToList(),
                CreatedAt = v.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<VideoDto> SaveVideoAsync(Guid userId, SaveVideoRequest request)
    {
        var video = new VideoLibraryItem
        {
            UserId = userId,
            RenderResultId = request.RenderResultId,
            Title = request.Title,
            PromptText = request.PromptText,
            Style = request.Style
        };

        // If linked to a render result, copy video/thumbnail URLs
        if (request.RenderResultId.HasValue)
        {
            var result = await _db.RenderResults.FindAsync(request.RenderResultId.Value);
            if (result != null)
            {
                video.VideoUrl = result.VideoUrl;
                video.ThumbnailUrl = result.ThumbnailUrl;
                video.Duration = $"0:{result.DurationSeconds:D2}";
            }
        }

        _db.VideoLibrary.Add(video);

        // Handle tags
        foreach (var tagName in request.Tags)
        {
            var tag = await _db.Tags.FirstOrDefaultAsync(t => t.Name == tagName);
            if (tag == null)
            {
                tag = new Tag { Name = tagName };
                _db.Tags.Add(tag);
                await _db.SaveChangesAsync(); // Need ID
            }
            _db.VideoTags.Add(new VideoTag { VideoId = video.Id, TagId = tag.Id });
        }

        await _db.SaveChangesAsync();

        return new VideoDto
        {
            Id = video.Id,
            Title = video.Title,
            PromptText = video.PromptText,
            Style = video.Style,
            ThumbnailUrl = video.ThumbnailUrl,
            VideoUrl = video.VideoUrl,
            Duration = video.Duration,
            Tags = request.Tags,
            CreatedAt = video.CreatedAt
        };
    }

    public async Task DeleteVideoAsync(Guid userId, Guid videoId)
    {
        var video = await _db.VideoLibrary.FirstOrDefaultAsync(v => v.Id == videoId && v.UserId == userId);
        if (video == null) throw new NotFoundException("Video", videoId);

        _db.VideoLibrary.Remove(video);
        await _db.SaveChangesAsync();
    }

    public async Task<DashboardDto> GetDashboardAsync(Guid userId)
    {
        var totalVideos = await _db.VideoLibrary.CountAsync(v => v.UserId == userId);
        var totalPrompts = await _db.GeneratedPrompts.CountAsync(p => p.UserId == userId);
        var pendingRenders = await _db.RenderRequests
            .CountAsync(r => r.UserId == userId && (r.Status == RenderStatus.Pending || r.Status == RenderStatus.Processing));

        var trendingSummary = await _db.Trends
            .OrderByDescending(t => t.CrawledAt)
            .Take(5)
            .Select(t => new TrendSummaryItem
            {
                Title = t.Title,
                Percent = t.DeltaPercent,
                Category = t.Category
            })
            .ToListAsync();

        var recentVideos = await _db.VideoLibrary
            .Include(v => v.VideoTags).ThenInclude(vt => vt.Tag)
            .Where(v => v.UserId == userId)
            .OrderByDescending(v => v.CreatedAt)
            .Take(3)
            .Select(v => new VideoDto
            {
                Id = v.Id,
                Title = v.Title,
                PromptText = v.PromptText,
                Style = v.Style,
                ThumbnailUrl = v.ThumbnailUrl,
                VideoUrl = v.VideoUrl,
                Duration = v.Duration,
                Tags = v.VideoTags.Select(vt => vt.Tag.Name).ToList(),
                CreatedAt = v.CreatedAt
            })
            .ToListAsync();

        return new DashboardDto
        {
            TotalVideos = totalVideos,
            TotalPrompts = totalPrompts,
            PendingRenders = pendingRenders,
            TrendingSummary = trendingSummary,
            RecentVideos = recentVideos
        };
    }
}
