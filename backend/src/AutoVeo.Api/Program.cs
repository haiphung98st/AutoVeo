using System.Text;
using System.Threading.RateLimiting;
using AutoVeo.Application.Interfaces;
using AutoVeo.Application.Validators;
using AutoVeo.Infrastructure.BackgroundJobs;
using AutoVeo.Infrastructure.Data;
using AutoVeo.Infrastructure.External;
using AutoVeo.Infrastructure.Services;
using AutoVeo.Shared.Middleware;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ──
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/autoveo-.log", rollingInterval: RollingInterval.Day,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// ── Database (SQLite for dev, SQL Server for prod) ──
var useSqlite = builder.Configuration.GetValue<bool>("UseSqlite", true);
if (useSqlite)
{
    builder.Services.AddDbContext<AutoVeoDbContext>(options =>
        options.UseSqlite("Data Source=AutoVeo.db"));
}
else
{
    builder.Services.AddDbContext<AutoVeoDbContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
}

// ── Authentication (JWT) ──
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key not configured");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── Rate Limiting ──
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;

    // Global: 100 requests per minute per IP
    options.AddPolicy("fixed", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 100,
                QueueLimit = 10,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));

    // Auth: stricter limit of 10 requests per minute per IP
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 10,
                QueueLimit = 2,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            }));
});

// ── Services (DI) ──
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITrendService, TrendService>();
builder.Services.AddScoped<IPromptService, PromptService>();
builder.Services.AddScoped<IRenderService, RenderService>();
builder.Services.AddScoped<IVideoLibraryService, VideoLibraryService>();

// ── External services ──
builder.Services.AddHttpClient<IVeo3Connector, Veo3Connector>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(5);
});
builder.Services.AddHttpClient<YouTubeTrendCollector>();
builder.Services.AddHttpClient<TikTokTrendCollector>();
builder.Services.AddHttpClient<GoogleTrendsCollector>();
builder.Services.AddScoped<ITrendCollector, YouTubeTrendCollector>();
builder.Services.AddScoped<ITrendCollector, TikTokTrendCollector>();
builder.Services.AddScoped<ITrendCollector, GoogleTrendsCollector>();

// ── Background workers ──
builder.Services.AddHostedService<TrendCrawlerWorker>();
builder.Services.AddHostedService<Veo3GenerationWorker>();

// ── Validation ──
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();
builder.Services.AddFluentValidationAutoValidation();

// ── Controllers + Swagger ──
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "AutoVeo API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseCors("Frontend");
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseSerilogRequestLogging();
Log.Information("Application environment: {Environment}", app.Environment.EnvironmentName);

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "AutoVeo API v1"));

app.UseRateLimiter();
// app.UseCors("Frontend"); // Moved up
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Database migration + seed ──
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AutoVeoDbContext>();
    await db.Database.EnsureCreatedAsync();
    await DataSeeder.SeedAsync(db);
}

Log.Information("AutoVeo API started on {Urls}", string.Join(", ", app.Urls));
app.Run("http://*:5050");
