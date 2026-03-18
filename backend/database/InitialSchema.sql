-- ============================================================
-- AutoVeo Database Schema - SQL Server
-- ============================================================

-- Users
CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    FullName NVARCHAR(200) NOT NULL,
    Email NVARCHAR(256) NOT NULL,
    PasswordHash NVARCHAR(512) NOT NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'User',
    IsActive BIT NOT NULL DEFAULT 1,
    FailedLoginAttempts INT NOT NULL DEFAULT 0,
    LockoutEnd DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);
CREATE INDEX IX_Users_Email ON Users(Email);

-- UserSessions
CREATE TABLE UserSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    RefreshToken NVARCHAR(512) NOT NULL,
    DeviceInfo NVARCHAR(500) NOT NULL DEFAULT '',
    IpAddress NVARCHAR(45) NOT NULL DEFAULT '',
    IsRevoked BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2 NOT NULL,
    CONSTRAINT FK_UserSessions_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_UserSessions_RefreshToken UNIQUE (RefreshToken)
);
CREATE INDEX IX_UserSessions_UserId ON UserSessions(UserId);

-- TrendSources
CREATE TABLE TrendSources (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Slug NVARCHAR(100) NOT NULL,
    ApiBaseUrl NVARCHAR(500) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_TrendSources_Slug UNIQUE (Slug)
);

-- Trends
CREATE TABLE Trends (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    TrendSourceId INT NOT NULL,
    Title NVARCHAR(500) NOT NULL,
    Category NVARCHAR(200) NOT NULL DEFAULT '',
    DeltaPercent NVARCHAR(50) NOT NULL DEFAULT '',
    Region NVARCHAR(50) NOT NULL DEFAULT 'Global',
    ThumbnailUrl NVARCHAR(2000) NULL,
    ExternalUrl NVARCHAR(2000) NULL,
    ViewCount BIGINT NULL,
    RawData NVARCHAR(MAX) NULL,
    CrawledAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2 NULL,
    CONSTRAINT FK_Trends_TrendSources FOREIGN KEY (TrendSourceId) REFERENCES TrendSources(Id)
);
CREATE INDEX IX_Trends_TrendSourceId ON Trends(TrendSourceId);
CREATE INDEX IX_Trends_CrawledAt ON Trends(CrawledAt DESC);
CREATE INDEX IX_Trends_Region ON Trends(Region);

-- PromptStyles
CREATE TABLE PromptStyles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CONSTRAINT UQ_PromptStyles_Name UNIQUE (Name)
);

-- GeneratedPrompts
CREATE TABLE GeneratedPrompts (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    Character NVARCHAR(500) NULL,
    Theme NVARCHAR(500) NULL,
    PromptStyleId INT NULL,
    SceneDetail NVARCHAR(2000) NULL,
    Duration NVARCHAR(20) NOT NULL DEFAULT '8s',
    PlatformTarget NVARCHAR(50) NOT NULL DEFAULT 'TikTok',
    PromptText NVARCHAR(MAX) NOT NULL,
    SourceTrendId UNIQUEIDENTIFIER NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_GeneratedPrompts_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_GeneratedPrompts_PromptStyles FOREIGN KEY (PromptStyleId) REFERENCES PromptStyles(Id) ON DELETE SET NULL,
    CONSTRAINT FK_GeneratedPrompts_Trends FOREIGN KEY (SourceTrendId) REFERENCES Trends(Id) ON DELETE SET NULL
);
CREATE INDEX IX_GeneratedPrompts_UserId ON GeneratedPrompts(UserId);
CREATE INDEX IX_GeneratedPrompts_CreatedAt ON GeneratedPrompts(CreatedAt DESC);

-- RenderRequests
CREATE TABLE RenderRequests (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    PromptId UNIQUEIDENTIFIER NOT NULL,
    AspectRatio NVARCHAR(20) NOT NULL DEFAULT '9:16',
    StyleOverride NVARCHAR(500) NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
    ExternalJobId NVARCHAR(500) NULL,
    SubmittedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    CONSTRAINT FK_RenderRequests_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_RenderRequests_Prompts FOREIGN KEY (PromptId) REFERENCES GeneratedPrompts(Id)
);
CREATE INDEX IX_RenderRequests_UserId ON RenderRequests(UserId);
CREATE INDEX IX_RenderRequests_Status ON RenderRequests(Status);

-- RenderResults
CREATE TABLE RenderResults (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    RenderRequestId UNIQUEIDENTIFIER NOT NULL,
    VideoUrl NVARCHAR(2000) NULL,
    ThumbnailUrl NVARCHAR(2000) NULL,
    DurationSeconds INT NOT NULL DEFAULT 0,
    FileSizeBytes BIGINT NULL,
    ErrorMessage NVARCHAR(2000) NULL,
    CompletedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_RenderResults_RenderRequests FOREIGN KEY (RenderRequestId) REFERENCES RenderRequests(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_RenderResults_RenderRequestId UNIQUE (RenderRequestId)
);

-- VideoLibrary
CREATE TABLE VideoLibrary (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    RenderResultId UNIQUEIDENTIFIER NULL,
    Title NVARCHAR(300) NOT NULL,
    PromptText NVARCHAR(MAX) NOT NULL,
    Style NVARCHAR(100) NOT NULL DEFAULT '',
    ThumbnailUrl NVARCHAR(2000) NULL,
    VideoUrl NVARCHAR(2000) NULL,
    Duration NVARCHAR(20) NOT NULL DEFAULT '0:00',
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_VideoLibrary_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_VideoLibrary_RenderResults FOREIGN KEY (RenderResultId) REFERENCES RenderResults(Id) ON DELETE SET NULL
);
CREATE INDEX IX_VideoLibrary_UserId ON VideoLibrary(UserId);
CREATE INDEX IX_VideoLibrary_CreatedAt ON VideoLibrary(CreatedAt DESC);

-- Tags
CREATE TABLE Tags (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    CONSTRAINT UQ_Tags_Name UNIQUE (Name)
);

-- VideoTags (many-to-many)
CREATE TABLE VideoTags (
    VideoId UNIQUEIDENTIFIER NOT NULL,
    TagId INT NOT NULL,
    CONSTRAINT PK_VideoTags PRIMARY KEY (VideoId, TagId),
    CONSTRAINT FK_VideoTags_Videos FOREIGN KEY (VideoId) REFERENCES VideoLibrary(Id) ON DELETE CASCADE,
    CONSTRAINT FK_VideoTags_Tags FOREIGN KEY (TagId) REFERENCES Tags(Id) ON DELETE CASCADE
);

-- AppLogs
CREATE TABLE AppLogs (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    Level NVARCHAR(50) NOT NULL DEFAULT 'Information',
    Message NVARCHAR(4000) NOT NULL,
    Exception NVARCHAR(MAX) NULL,
    RequestPath NVARCHAR(500) NULL,
    UserId NVARCHAR(100) NULL,
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
CREATE INDEX IX_AppLogs_Timestamp ON AppLogs(Timestamp DESC);
CREATE INDEX IX_AppLogs_Level ON AppLogs(Level);

-- SystemSettings
CREATE TABLE SystemSettings (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    [Key] NVARCHAR(200) NOT NULL,
    Value NVARCHAR(2000) NOT NULL DEFAULT '',
    Description NVARCHAR(500) NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_SystemSettings_Key UNIQUE ([Key])
);

-- ============================================================
-- View: vw_UserActivity
-- ============================================================
GO
CREATE VIEW vw_UserActivity AS
SELECT
    u.Id AS UserId,
    u.FullName,
    u.Email,
    u.CreatedAt AS UserCreatedAt,
    (SELECT COUNT(*) FROM GeneratedPrompts p WHERE p.UserId = u.Id) AS TotalPrompts,
    (SELECT COUNT(*) FROM RenderRequests r WHERE r.UserId = u.Id) AS TotalRenders,
    (SELECT COUNT(*) FROM RenderRequests r WHERE r.UserId = u.Id AND r.Status = 'Completed') AS CompletedRenders,
    (SELECT COUNT(*) FROM VideoLibrary v WHERE v.UserId = u.Id) AS TotalVideos,
    (SELECT MAX(p.CreatedAt) FROM GeneratedPrompts p WHERE p.UserId = u.Id) AS LastPromptAt,
    (SELECT MAX(r.SubmittedAt) FROM RenderRequests r WHERE r.UserId = u.Id) AS LastRenderAt,
    (SELECT COUNT(*) FROM UserSessions s WHERE s.UserId = u.Id AND s.IsRevoked = 0 AND s.ExpiresAt > GETUTCDATE()) AS ActiveSessions
FROM Users u;
GO

-- ============================================================
-- Seed Data
-- ============================================================
INSERT INTO TrendSources (Name, Slug, ApiBaseUrl) VALUES
    ('YouTube', 'youtube', 'https://www.googleapis.com/youtube/v3'),
    ('TikTok', 'tiktok', 'https://open.tiktokapis.com/v2'),
    ('Google Trends', 'google-trends', 'https://trends.google.com');

INSERT INTO PromptStyles (Name, Description) VALUES
    ('Cinematic', 'Cinematic film-like quality with dramatic lighting'),
    ('Anime', 'Japanese anime-inspired art style'),
    ('Realistic', 'Photorealistic video generation'),
    ('Abstract', 'Abstract shapes and patterns'),
    ('Neon Cyberpunk', 'Neon-lit cyberpunk aesthetic'),
    ('Retro', 'Retro/vintage visual style'),
    ('Minimalist', 'Clean minimalist design');

INSERT INTO SystemSettings ([Key], Value, Description) VALUES
    ('TrendCrawler:IntervalMinutes', '60', 'How often to crawl trends (minutes)'),
    ('Veo3:MaxConcurrentJobs', '5', 'Max simultaneous Veo3 render jobs'),
    ('Auth:MaxFailedAttempts', '5', 'Max failed logins before lockout'),
    ('Auth:LockoutMinutes', '15', 'Account lockout duration (minutes)');
