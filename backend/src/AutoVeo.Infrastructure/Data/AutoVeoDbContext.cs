using AutoVeo.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AutoVeo.Infrastructure.Data;

public class AutoVeoDbContext : DbContext
{
    public AutoVeoDbContext(DbContextOptions<AutoVeoDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<TrendSource> TrendSources => Set<TrendSource>();
    public DbSet<Trend> Trends => Set<Trend>();
    public DbSet<PromptStyle> PromptStyles => Set<PromptStyle>();
    public DbSet<GeneratedPrompt> GeneratedPrompts => Set<GeneratedPrompt>();
    public DbSet<RenderRequest> RenderRequests => Set<RenderRequest>();
    public DbSet<RenderResult> RenderResults => Set<RenderResult>();
    public DbSet<VideoLibraryItem> VideoLibrary => Set<VideoLibraryItem>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<VideoTag> VideoTags => Set<VideoTag>();
    public DbSet<AppLog> AppLogs => Set<AppLog>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ──
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(256);
            e.Property(u => u.FullName).HasMaxLength(200);
            e.Property(u => u.PasswordHash).HasMaxLength(512);
            e.Property(u => u.Role).HasMaxLength(50).HasDefaultValue("User");
        });

        // ── UserSession ──
        modelBuilder.Entity<UserSession>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasIndex(s => s.RefreshToken).IsUnique();
            e.HasIndex(s => s.UserId);
            e.Property(s => s.RefreshToken).HasMaxLength(512);
            e.Property(s => s.DeviceInfo).HasMaxLength(500);
            e.Property(s => s.IpAddress).HasMaxLength(45);
            e.HasOne(s => s.User).WithMany(u => u.Sessions)
                .HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── TrendSource ──
        modelBuilder.Entity<TrendSource>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasIndex(t => t.Slug).IsUnique();
            e.Property(t => t.Name).HasMaxLength(100);
            e.Property(t => t.Slug).HasMaxLength(100);
            e.Property(t => t.ApiBaseUrl).HasMaxLength(500);
        });

        // ── Trend ──
        modelBuilder.Entity<Trend>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasIndex(t => t.TrendSourceId);
            e.HasIndex(t => t.CrawledAt);
            e.HasIndex(t => t.Region);
            e.Property(t => t.Title).HasMaxLength(500);
            e.Property(t => t.Category).HasMaxLength(200);
            e.Property(t => t.DeltaPercent).HasMaxLength(50);
            e.Property(t => t.Region).HasMaxLength(50);
            e.Property(t => t.ThumbnailUrl).HasMaxLength(2000);
            e.Property(t => t.ExternalUrl).HasMaxLength(2000);
            e.HasOne(t => t.TrendSource).WithMany(ts => ts.Trends)
                .HasForeignKey(t => t.TrendSourceId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── PromptStyle ──
        modelBuilder.Entity<PromptStyle>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasIndex(p => p.Name).IsUnique();
            e.Property(p => p.Name).HasMaxLength(100);
            e.Property(p => p.Description).HasMaxLength(500);
        });

        // ── GeneratedPrompt ──
        modelBuilder.Entity<GeneratedPrompt>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasIndex(p => p.UserId);
            e.HasIndex(p => p.CreatedAt);
            e.Property(p => p.Character).HasMaxLength(500);
            e.Property(p => p.Theme).HasMaxLength(500);
            e.Property(p => p.SceneDetail).HasMaxLength(2000);
            e.Property(p => p.Duration).HasMaxLength(20);
            e.Property(p => p.PlatformTarget).HasMaxLength(50);
            e.Property(p => p.PromptText).HasMaxLength(5000);
            e.HasOne(p => p.User).WithMany(u => u.Prompts)
                .HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(p => p.PromptStyle).WithMany(ps => ps.Prompts)
                .HasForeignKey(p => p.PromptStyleId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.SourceTrend).WithMany()
                .HasForeignKey(p => p.SourceTrendId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── RenderRequest ──
        modelBuilder.Entity<RenderRequest>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => r.UserId);
            e.HasIndex(r => r.Status);
            e.Property(r => r.AspectRatio).HasMaxLength(20);
            e.Property(r => r.StyleOverride).HasMaxLength(500);
            e.Property(r => r.Status).HasMaxLength(50);
            e.Property(r => r.ExternalJobId).HasMaxLength(500);
            e.HasOne(r => r.User).WithMany(u => u.RenderRequests)
                .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Prompt).WithMany(p => p.RenderRequests)
                .HasForeignKey(r => r.PromptId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── RenderResult ──
        modelBuilder.Entity<RenderResult>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => r.RenderRequestId).IsUnique();
            e.Property(r => r.VideoUrl).HasMaxLength(2000);
            e.Property(r => r.ThumbnailUrl).HasMaxLength(2000);
            e.Property(r => r.ErrorMessage).HasMaxLength(2000);
            e.HasOne(r => r.RenderRequest).WithOne(rr => rr.Result)
                .HasForeignKey<RenderResult>(r => r.RenderRequestId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── VideoLibraryItem ──
        modelBuilder.Entity<VideoLibraryItem>(e =>
        {
            e.HasKey(v => v.Id);
            e.HasIndex(v => v.UserId);
            e.HasIndex(v => v.CreatedAt);
            e.Property(v => v.Title).HasMaxLength(300);
            e.Property(v => v.PromptText).HasMaxLength(5000);
            e.Property(v => v.Style).HasMaxLength(100);
            e.Property(v => v.ThumbnailUrl).HasMaxLength(2000);
            e.Property(v => v.VideoUrl).HasMaxLength(2000);
            e.Property(v => v.Duration).HasMaxLength(20);
            e.HasOne(v => v.User).WithMany(u => u.VideoLibrary)
                .HasForeignKey(v => v.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(v => v.RenderResult).WithMany()
                .HasForeignKey(v => v.RenderResultId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── Tag ──
        modelBuilder.Entity<Tag>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasIndex(t => t.Name).IsUnique();
            e.Property(t => t.Name).HasMaxLength(100);
        });

        // ── VideoTag (many-to-many join) ──
        modelBuilder.Entity<VideoTag>(e =>
        {
            e.HasKey(vt => new { vt.VideoId, vt.TagId });
            e.HasOne(vt => vt.Video).WithMany(v => v.VideoTags)
                .HasForeignKey(vt => vt.VideoId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(vt => vt.Tag).WithMany(t => t.VideoTags)
                .HasForeignKey(vt => vt.TagId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── AppLog ──
        modelBuilder.Entity<AppLog>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasIndex(l => l.Timestamp);
            e.HasIndex(l => l.Level);
            e.Property(l => l.Level).HasMaxLength(50);
            e.Property(l => l.Message).HasMaxLength(4000);
            e.Property(l => l.RequestPath).HasMaxLength(500);
            e.Property(l => l.UserId).HasMaxLength(100);
        });

        // ── SystemSetting ──
        modelBuilder.Entity<SystemSetting>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasIndex(s => s.Key).IsUnique();
            e.Property(s => s.Key).HasMaxLength(200);
            e.Property(s => s.Value).HasMaxLength(2000);
            e.Property(s => s.Description).HasMaxLength(500);
        });
    }
}
