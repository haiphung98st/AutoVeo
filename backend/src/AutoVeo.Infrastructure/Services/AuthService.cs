using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AutoVeo.Application.DTOs.Auth;
using AutoVeo.Application.Interfaces;
using AutoVeo.Domain.Entities;
using AutoVeo.Infrastructure.Data;
using AutoVeo.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace AutoVeo.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AutoVeoDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AutoVeoDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, string ipAddress)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
            throw new UnauthorizedException("Invalid email or password.");

        // Brute force check
        if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTime.UtcNow)
            throw new TooManyRequestsException($"Account locked. Try again after {user.LockoutEnd.Value:HH:mm} UTC.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            var maxAttempts = int.Parse(_config["Auth:MaxFailedAttempts"] ?? "5");
            if (user.FailedLoginAttempts >= maxAttempts)
            {
                var lockoutMinutes = int.Parse(_config["Auth:LockoutMinutes"] ?? "15");
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(lockoutMinutes);
            }
            await _db.SaveChangesAsync();
            throw new UnauthorizedException("Invalid email or password.");
        }

        // Reset failed attempts on success
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        var session = await CreateSessionAsync(user, request.DeviceInfo ?? "Unknown", ipAddress);
        var accessToken = GenerateAccessToken(user);

        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = session.RefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:ExpiryMinutes"] ?? "60")),
            User = MapUserDto(user)
        };
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, string ipAddress)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            throw new ConflictException("An account with this email already exists.");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
        };

        _db.Users.Add(user);
        var session = await CreateSessionAsync(user, "Registration", ipAddress);
        var accessToken = GenerateAccessToken(user);

        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = session.RefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:ExpiryMinutes"] ?? "60")),
            User = MapUserDto(user)
        };
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        // Always return success to avoid email enumeration
        if (user == null) return;

        // In production: generate a password reset token and send email
        // For now, log the action
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, string ipAddress)
    {
        var session = await _db.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.RefreshToken == request.RefreshToken);

        if (session == null || session.IsRevoked || session.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedException("Invalid or expired refresh token.");

        // Rotate refresh token
        session.IsRevoked = true;
        var newSession = await CreateSessionAsync(session.User, session.DeviceInfo, ipAddress);
        var accessToken = GenerateAccessToken(session.User);

        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = newSession.RefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:ExpiryMinutes"] ?? "60")),
            User = MapUserDto(session.User)
        };
    }

    public async Task LogoutAsync(Guid userId, string refreshToken)
    {
        var session = await _db.UserSessions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.RefreshToken == refreshToken);
        if (session != null)
        {
            session.IsRevoked = true;
            await _db.SaveChangesAsync();
        }
    }

    public async Task LogoutAllDevicesAsync(Guid userId)
    {
        var sessions = await _db.UserSessions
            .Where(s => s.UserId == userId && !s.IsRevoked)
            .ToListAsync();

        foreach (var session in sessions)
            session.IsRevoked = true;

        await _db.SaveChangesAsync();
    }

    // ── Private helpers ──

    private string GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured")));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiryMinutes = double.Parse(_config["Jwt:ExpiryMinutes"] ?? "60");

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<UserSession> CreateSessionAsync(User user, string deviceInfo, string ipAddress)
    {
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var refreshExpiryDays = int.Parse(_config["Jwt:RefreshTokenExpiryDays"] ?? "7");

        var session = new UserSession
        {
            UserId = user.Id,
            RefreshToken = refreshToken,
            DeviceInfo = deviceInfo,
            IpAddress = ipAddress,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshExpiryDays)
        };

        _db.UserSessions.Add(session);
        return session;
    }

    private static UserDto MapUserDto(User user) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        Role = user.Role
    };
}
