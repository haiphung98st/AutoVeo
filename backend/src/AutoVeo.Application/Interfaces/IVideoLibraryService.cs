using AutoVeo.Application.DTOs.Videos;
using AutoVeo.Shared.Models;

namespace AutoVeo.Application.Interfaces;

public interface IVideoLibraryService
{
    Task<ApiResponse<List<VideoDto>>> GetVideosAsync(Guid userId, VideoQueryParams queryParams);
    Task<VideoDto?> GetVideoByIdAsync(Guid userId, Guid videoId);
    Task<VideoDto> SaveVideoAsync(Guid userId, SaveVideoRequest request);
    Task DeleteVideoAsync(Guid userId, Guid videoId);
    Task<DashboardDto> GetDashboardAsync(Guid userId);
}
