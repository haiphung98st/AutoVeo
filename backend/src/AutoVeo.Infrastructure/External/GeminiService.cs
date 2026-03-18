using System.Text.Json;
using AutoVeo.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AutoVeo.Infrastructure.External;

public class GeminiService : IAIService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(HttpClient http, IConfiguration config, ILogger<GeminiService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<List<AISceneDescriptor>> GenerateConsistentScenesAsync(
        string keyword, 
        int count, 
        string? characterStyle = null, 
        string? visualTheme = null, 
        CancellationToken ct = default)
    {
        var apiKey = _config["Gemini:ApiKey"];
        var baseUrl = _config["Gemini:BaseUrl"];


        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("Gemini API Key is missing. Falling back to mock data.");
            return GenerateMockConsistentScenes(keyword, count, characterStyle, visualTheme);
        }

        try
        {
            var systemPrompt = "You are an expert cinematic storyboard artist. Your task is to generate a series of video prompts that form a COHESIVE NARRATIVE with DEEP VISUAL CONSISTENCY.\n" +
                               "1. **DETAILED CHARACTER IDENTITY**: Design a vivid, highly detailed physical description for the main character (clothing, hair, distinct features, material textures). You must REPEAT this exact character description across all scenes to ensure the AI generates the same person/entity.\n" +
                               "2. **UNIFIED VISUAL THEME**: Establish a core visual style including specific lighting (e.g., 'golden hour glow', 'fluorescent flickering'), color palette, and camera language. This theme must be perfectly aligned across the series.\n" +
                               "3. **CHRONOLOGICAL PROGRESSION**: The scenes must follow a logical sequence (e.g., Part 1: Arrival, Part 2: Interaction, Part 3: Conclusion). Each scene is 8 seconds of action.\n" +
                               "Output MUST be a raw JSON array of objects (no markdown blocks, no extra text). Each object must have: \"Character\", \"Theme\", \"SceneDetail\".";

            var userPrompt = $"Keyword: {keyword}. \n" +
                             $"Number of scenes: {count}. \n" +
                             $"Narrative Direction: Create a short sequential story or action arc related to the keyword.\n" +
                             $"Consistency requirements: \n" +
                             $"- Character should be: {characterStyle ?? "detect from keyword"} \n" +
                             $"- Visual Theme should be: {visualTheme ?? "detect from keyword"}";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = $"{systemPrompt}\n\n{userPrompt}" } }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.7,
                    response_mime_type = "application/json"
                }
            };

            var jsonRequest = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonRequest, System.Text.Encoding.UTF8, "application/json");

            var requestUrl = $"{baseUrl}?key={apiKey}";
            var response = await _http.PostAsync(requestUrl, content, ct);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Gemini API Error ({StatusCode}): {Body}", response.StatusCode, errorBody);
                response.EnsureSuccessStatusCode();
            }

            var jsonResponse = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(jsonResponse);
            
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrEmpty(text)) throw new Exception("Empty response from AI");

            return JsonSerializer.Deserialize<List<AISceneDescriptor>>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) 
                   ?? new List<AISceneDescriptor>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gemini API call failed. Falling back to mock data.");
            return GenerateMockConsistentScenes(keyword, count, characterStyle, visualTheme);
        }
    }

    private List<AISceneDescriptor> GenerateMockConsistentScenes(string keyword, int count, string? characterStyle, string? visualTheme)
    {
        var scenes = new List<AISceneDescriptor>();
        var charDescriptor = characterStyle ?? $"a unique character from {keyword}";
        var themeDescriptor = visualTheme ?? $"a {keyword} world";

        for (int i = 1; i <= count; i++)
        {
            scenes.Add(new AISceneDescriptor
            {
                Character = charDescriptor,
                Theme = themeDescriptor,
                SceneDetail = $"Scene {i}: The character explores {keyword} - part {i}."
            });
        }

        return scenes;
    }
}
