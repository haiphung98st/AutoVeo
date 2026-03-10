namespace AutoVeo.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User"; // User, Admin
    public bool IsActive { get; set; } = true;
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<UserSession> Sessions { get; set; } = new List<UserSession>();
    public ICollection<GeneratedPrompt> Prompts { get; set; } = new List<GeneratedPrompt>();
    public ICollection<RenderRequest> RenderRequests { get; set; } = new List<RenderRequest>();
    public ICollection<VideoLibraryItem> VideoLibrary { get; set; } = new List<VideoLibraryItem>();
}
