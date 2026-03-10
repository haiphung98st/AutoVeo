using AutoVeo.Application.DTOs.Auth;
using AutoVeo.Application.DTOs.Prompts;
using AutoVeo.Application.DTOs.Render;
using AutoVeo.Application.DTOs.Videos;
using FluentValidation;

namespace AutoVeo.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
    }
}

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128)
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one number.");
        RuleFor(x => x.ConfirmPassword).Equal(x => x.Password)
            .WithMessage("Passwords do not match.");
    }
}

public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
    }
}

public class GeneratePromptRequestValidator : AbstractValidator<GeneratePromptRequest>
{
    private static readonly string[] ValidStyles = 
        { "Cinematic", "Anime", "Realistic", "Abstract", "Neon Cyberpunk", "Retro", "Minimalist" };
    private static readonly string[] ValidDurations = { "5s", "10s", "20s" };
    private static readonly string[] ValidPlatforms = { "TikTok", "YouTube Shorts" };

    public GeneratePromptRequestValidator()
    {
        RuleFor(x => x.Character).MaximumLength(500);
        RuleFor(x => x.Theme).MaximumLength(500);
        RuleFor(x => x.Style).Must(s => ValidStyles.Contains(s))
            .WithMessage($"Style must be one of: {string.Join(", ", ValidStyles)}");
        RuleFor(x => x.SceneDetail).MaximumLength(2000);
        RuleFor(x => x.Duration).Must(d => ValidDurations.Contains(d))
            .WithMessage($"Duration must be one of: {string.Join(", ", ValidDurations)}");
        RuleFor(x => x.PlatformTarget).Must(p => ValidPlatforms.Contains(p))
            .WithMessage($"Platform must be one of: {string.Join(", ", ValidPlatforms)}");
    }
}

public class SubmitRenderRequestValidator : AbstractValidator<SubmitRenderRequest>
{
    private static readonly string[] ValidRatios = { "9:16", "16:9", "1:1" };

    public SubmitRenderRequestValidator()
    {
        RuleFor(x => x.AspectRatio).Must(r => ValidRatios.Contains(r))
            .WithMessage($"Aspect ratio must be one of: {string.Join(", ", ValidRatios)}");
        RuleFor(x => x.StyleOverride).MaximumLength(500);
        // Either PromptId or PromptText must be provided
        RuleFor(x => x).Must(x => x.PromptId != Guid.Empty || !string.IsNullOrWhiteSpace(x.PromptText))
            .WithMessage("Either PromptId or PromptText must be provided.");
    }
}

public class SaveVideoRequestValidator : AbstractValidator<SaveVideoRequest>
{
    public SaveVideoRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.PromptText).NotEmpty().MaximumLength(5000);
        RuleFor(x => x.Style).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Tags).Must(t => t.Count <= 10)
            .WithMessage("Maximum 10 tags allowed.");
    }
}
