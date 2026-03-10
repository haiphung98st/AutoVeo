using AutoVeo.Application.DTOs.Auth;

namespace AutoVeo.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> LoginAsync(LoginRequest request, string ipAddress);
    Task<AuthResponse> RegisterAsync(RegisterRequest request, string ipAddress);
    Task ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, string ipAddress);
    Task LogoutAsync(Guid userId, string refreshToken);
    Task LogoutAllDevicesAsync(Guid userId);
}
