import { apiClient } from "./apiClient";
import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    TrendDto,
    TrendQueryParams,
    TrendSummaryDto,
    GeneratePromptRequest,
    PromptResponse,
    GenerateConsistentSeriesRequest,
    SeriesPromptResponse,
    SubmitRenderRequest,
    RenderStatusResponse,
    VideoDto,
    VideoQueryParams,
    SaveVideoRequest,
    DashboardDto,
} from "../types/api";

// ── Auth API ──
export const authApi = {
    login: (data: LoginRequest) =>
        apiClient.post<AuthResponse>("/auth/login", data),

    register: (data: RegisterRequest) =>
        apiClient.post<AuthResponse>("/auth/register", data),

    forgotPassword: (data: ForgotPasswordRequest) =>
        apiClient.post<null>("/auth/forgot-password", data),

    logout: (refreshToken: string) =>
        apiClient.post<null>("/auth/logout", { refreshToken }),
};

// ── Trends API ──
export const trendsApi = {
    getAll: (params?: TrendQueryParams) =>
        apiClient.get<TrendDto[]>("/trends", params as Record<string, string | number>),

    getSummary: (count = 5) =>
        apiClient.get<TrendSummaryDto[]>("/trends/summary", { count }),

    getById: (id: string) =>
        apiClient.get<TrendDto>(`/trends/${id}`),
};

// ── Prompts API ──
export const promptsApi = {
    generate: (data: GeneratePromptRequest) =>
        apiClient.post<PromptResponse>("/prompts/generate", data),

    generateSeries: (data: GenerateConsistentSeriesRequest) =>
        apiClient.post<SeriesPromptResponse>("/prompts/generate-series", data),

    getAll: (page = 1, pageSize = 20) =>
        apiClient.get<PromptResponse[]>("/prompts", { page, pageSize }),

    getById: (id: string) =>
        apiClient.get<PromptResponse>(`/prompts/${id}`),
};

// ── Render API ──
export const renderApi = {
    submit: (data: SubmitRenderRequest) =>
        apiClient.post<RenderStatusResponse>("/render", data),

    getStatus: (id: string) =>
        apiClient.get<RenderStatusResponse>(`/render/${id}/status`),
};

// ── Videos API ──
export const videosApi = {
    getAll: (params?: VideoQueryParams) =>
        apiClient.get<VideoDto[]>("/videos", params as Record<string, string | number>),

    getById: (id: string) =>
        apiClient.get<VideoDto>(`/videos/${id}`),

    save: (data: SaveVideoRequest) =>
        apiClient.post<VideoDto>("/videos", data),

    delete: (id: string) =>
        apiClient.delete<null>(`/videos/${id}`),
};

// ── Dashboard API ──
export const dashboardApi = {
    get: () => apiClient.get<DashboardDto>("/dashboard"),
};
