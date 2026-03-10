using System.Security.Claims;
using AutoVeo.Application.DTOs.Auth;
using AutoVeo.Application.Interfaces;
using AutoVeo.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace AutoVeo.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Login with email and password</summary>
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var result = await _authService.LoginAsync(request, ip);
        return Ok(ApiResponse<AuthResponse>.Ok(result, "Login successful"));
    }

    /// <summary>Register a new account</summary>
    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register([FromBody] RegisterRequest request)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var result = await _authService.RegisterAsync(request, ip);
        return StatusCode(201, ApiResponse<AuthResponse>.Ok(result, "Registration successful"));
    }

    /// <summary>Send password reset email</summary>
    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        await _authService.ForgotPasswordAsync(request);
        return Ok(ApiResponse<object>.Ok(null!, "If this email is registered, a reset link has been sent."));
    }

    /// <summary>Refresh access token using refresh token</summary>
    [HttpPost("refresh-token")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var result = await _authService.RefreshTokenAsync(request, ip);
        return Ok(ApiResponse<AuthResponse>.Ok(result));
    }

    /// <summary>Logout (revoke refresh token)</summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object>>> Logout([FromBody] RefreshTokenRequest request)
    {
        var userId = GetUserId();
        await _authService.LogoutAsync(userId, request.RefreshToken);
        return Ok(ApiResponse<object>.Ok(null!, "Logged out successfully"));
    }

    /// <summary>Logout from all devices</summary>
    [HttpPost("logout-all")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object>>> LogoutAll()
    {
        var userId = GetUserId();
        await _authService.LogoutAllDevicesAsync(userId);
        return Ok(ApiResponse<object>.Ok(null!, "Logged out from all devices"));
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
