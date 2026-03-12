// API response types matching the backend's ApiResponse<T>
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: string[];
    pagination?: PaginationMeta;
    timestamp: string;
}

export interface PaginationMeta {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

// Auth
export interface LoginRequest {
    email: string;
    password: string;
    deviceInfo?: string;
}

export interface RegisterRequest {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    user: UserDto;
}

export interface UserDto {
    id: string;
    fullName: string;
    email: string;
    role: string;
}

// Trends
export interface TrendDto {
    id: string;
    title: string;
    category: string;
    deltaPercent: string;
    region: string;
    thumbnailUrl?: string;
    platform: string;
    crawledAt: string;
}

export interface TrendQueryParams {
    platform?: string;
    range?: string;
    region?: string;
    page?: number;
    pageSize?: number;
}

export interface TrendSummaryDto {
    title: string;
    percent: string;
    category: string;
    trend: "up" | "down" | "neutral";
}

// Prompts
export interface GeneratePromptRequest {
    character?: string;
    theme?: string;
    style: string;
    sceneDetail?: string;
    duration: string;
    platformTarget: string;
    sourceTrendId?: string;
}

export interface PromptResponse {
    id: string;
    promptText: string;
    character?: string;
    theme?: string;
    style: string;
    duration: string;
    platformTarget: string;
    createdAt: string;
}

// Render
export interface SubmitRenderRequest {
    promptId?: string;
    promptText?: string;
    aspectRatio: string;
    styleOverride?: string;
}

export interface RenderStatusResponse {
    renderRequestId: string;
    status: string;
    logs: string[];
    videoUrl?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    submittedAt: string;
    completedAt?: string;
    errorMessage?: string;
}

// Videos
export interface VideoDto {
    id: string;
    title: string;
    promptText: string;
    style: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    duration: string;
    tags: string[];
    createdAt: string;
}

export interface SaveVideoRequest {
    renderResultId?: string;
    title: string;
    promptText: string;
    style: string;
    tags: string[];
}

export interface VideoQueryParams {
    search?: string;
    style?: string;
    dateRange?: string;
    page?: number;
    pageSize?: number;
}

// Dashboard
export interface DashboardDto {
    totalVideos: number;
    totalPrompts: number;
    pendingRenders: number;
    trendingSummary: TrendSummaryDto[];
    recentVideos: VideoDto[];
}
