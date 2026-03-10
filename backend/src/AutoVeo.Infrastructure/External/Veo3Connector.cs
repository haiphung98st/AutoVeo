using System.Net.Http.Json;
using System.Text.Json;
using AutoVeo.Application.Interfaces;
using AutoVeo.Shared.Exceptions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AutoVeo.Infrastructure.External;

/// <summary>
/// HTTP connector for Google Veo3 (labs.google/flow) video generation API.
/// Uses exponential backoff retries and configurable API key.
/// </summary>
public class Veo3Connector : IVeo3Connector
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<Veo3Connector> _logger;
    private const int MaxRetries = 3;

    public Veo3Connector(HttpClient http, IConfiguration config, ILogger<Veo3Connector> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;

        var baseUrl = _config["Veo3:BaseUrl"] ?? "https://labs.google/flow/api/v1";
        _http.BaseAddress = new Uri(baseUrl);
        _http.DefaultRequestHeaders.Add("Accept", "application/json");

        var apiKey = _config["Veo3:ApiKey"];
        if (!string.IsNullOrEmpty(apiKey))
            _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
    }

    public async Task<Veo3SubmitResult> SubmitPromptAsync(string promptText, string aspectRatio, string? styleOverride = null)
    {
        var payload = new
        {
            prompt = promptText,
            aspect_ratio = aspectRatio,
            style_override = styleOverride,
            output_format = "mp4",
            quality = "high"
        };

        for (int attempt = 1; attempt <= MaxRetries; attempt++)
        {
            try
            {
                _logger.LogInformation("Veo3 submit attempt {Attempt}/{Max} for prompt: {Prompt}",
                    attempt, MaxRetries, promptText[..Math.Min(100, promptText.Length)]);

                var response = await _http.PostAsJsonAsync("/generate", payload);

                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds ?? Math.Pow(2, attempt) * 5;
                    _logger.LogWarning("Veo3 rate limited. Retrying after {Seconds}s", retryAfter);
                    await Task.Delay(TimeSpan.FromSeconds(retryAfter));
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Veo3 error {StatusCode}: {Body}", response.StatusCode, errorBody);

                    if (attempt == MaxRetries)
                        return new Veo3SubmitResult { Success = false, ErrorMessage = $"Veo3 returned {response.StatusCode}: {errorBody}" };

                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
                    continue;
                }

                var result = await response.Content.ReadFromJsonAsync<Veo3ApiResponse>();
                return new Veo3SubmitResult
                {
                    Success = true,
                    JobId = result?.JobId ?? result?.Id
                };
            }
            catch (HttpRequestException ex) when (attempt < MaxRetries)
            {
                _logger.LogWarning(ex, "Veo3 network error on attempt {Attempt}", attempt);
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
            }
            catch (TaskCanceledException ex) when (attempt < MaxRetries)
            {
                _logger.LogWarning(ex, "Veo3 timeout on attempt {Attempt}", attempt);
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
            }
        }

        return new Veo3SubmitResult { Success = false, ErrorMessage = "Failed after all retries" };
    }

    public async Task<Veo3JobStatus> GetJobStatusAsync(string jobId)
    {
        try
        {
            var response = await _http.GetAsync($"/jobs/{jobId}");

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                throw new ExternalServiceException("Veo3", $"Status check failed ({response.StatusCode}): {errorBody}");
            }

            var result = await response.Content.ReadFromJsonAsync<Veo3JobStatusApiResponse>();

            return new Veo3JobStatus
            {
                JobId = jobId,
                Status = result?.Status ?? "unknown",
                VideoUrl = result?.OutputUrl ?? result?.VideoUrl,
                ThumbnailUrl = result?.ThumbnailUrl,
                DurationSeconds = result?.DurationSeconds,
                ErrorMessage = result?.Error,
                ProgressPercent = result?.Progress
            };
        }
        catch (Exception ex) when (ex is not ExternalServiceException)
        {
            _logger.LogError(ex, "Failed to get Veo3 job status for {JobId}", jobId);
            throw new ExternalServiceException("Veo3", ex.Message);
        }
    }

    // Internal API response models
    private class Veo3ApiResponse
    {
        public string? Id { get; set; }
        public string? JobId { get; set; }
        public string? Status { get; set; }
    }

    private class Veo3JobStatusApiResponse
    {
        public string? Status { get; set; }
        public string? OutputUrl { get; set; }
        public string? VideoUrl { get; set; }
        public string? ThumbnailUrl { get; set; }
        public int? DurationSeconds { get; set; }
        public string? Error { get; set; }
        public double? Progress { get; set; }
    }
}
