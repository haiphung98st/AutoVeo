using AutoVeo.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AutoVeo.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(AutoVeoDbContext context)
    {
        if (!await context.TrendSources.AnyAsync())
        {
            context.TrendSources.AddRange(
                new TrendSource { Id = 1, Name = "YouTube", Slug = "youtube", ApiBaseUrl = "https://www.googleapis.com/youtube/v3" },
                new TrendSource { Id = 2, Name = "TikTok", Slug = "tiktok", ApiBaseUrl = "https://open.tiktokapis.com/v2" },
                new TrendSource { Id = 3, Name = "Google Trends", Slug = "google-trends", ApiBaseUrl = "https://trends.google.com" }
            );
        }

        if (!await context.PromptStyles.AnyAsync())
        {
            context.PromptStyles.AddRange(
                new PromptStyle { Id = 1, Name = "Cinematic", Description = "Cinematic film-like quality with dramatic lighting" },
                new PromptStyle { Id = 2, Name = "Anime", Description = "Japanese anime-inspired art style" },
                new PromptStyle { Id = 3, Name = "Realistic", Description = "Photorealistic video generation" },
                new PromptStyle { Id = 4, Name = "Abstract", Description = "Abstract shapes and patterns" },
                new PromptStyle { Id = 5, Name = "Neon Cyberpunk", Description = "Neon-lit cyberpunk aesthetic" },
                new PromptStyle { Id = 6, Name = "Retro", Description = "Retro/vintage visual style" },
                new PromptStyle { Id = 7, Name = "Minimalist", Description = "Clean minimalist design" }
            );
        }

        if (!await context.SystemSettings.AnyAsync())
        {
            context.SystemSettings.AddRange(
                new SystemSetting { Key = "TrendCrawler:IntervalMinutes", Value = "60", Description = "How often to crawl trends (minutes)" },
                new SystemSetting { Key = "TrendCrawler:MaxPerSource", Value = "50", Description = "Max trends to collect per source per crawl" },
                new SystemSetting { Key = "Veo3:MaxConcurrentJobs", Value = "5", Description = "Max simultaneous Veo3 render jobs" },
                new SystemSetting { Key = "Veo3:PollIntervalSeconds", Value = "10", Description = "How often to poll Veo3 job status" },
                new SystemSetting { Key = "Auth:MaxFailedAttempts", Value = "5", Description = "Max failed logins before lockout" },
                new SystemSetting { Key = "Auth:LockoutMinutes", Value = "15", Description = "Account lockout duration (minutes)" }
            );
        }

        await context.SaveChangesAsync();
    }
}
