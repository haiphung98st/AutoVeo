import type { ApiResponse } from "../types/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

class ApiClient {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;

    constructor() {
        this.accessToken = localStorage.getItem("accessToken");
        this.refreshToken = localStorage.getItem("refreshToken");
    }

    setTokens(accessToken: string, refreshToken: string) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
    }

    getAccessToken() {
        return this.accessToken;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${API_BASE}${endpoint}`;

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(options.headers as Record<string, string>),
        };

        if (this.accessToken) {
            headers["Authorization"] = `Bearer ${this.accessToken}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle 401 — try to refresh token
        if (response.status === 401 && this.refreshToken) {
            const refreshed = await this.tryRefreshToken();
            if (refreshed) {
                headers["Authorization"] = `Bearer ${this.accessToken}`;
                const retryResponse = await fetch(url, { ...options, headers });
                return retryResponse.json();
            } else {
                this.clearTokens();
                window.location.href = "/login";
                throw new Error("Session expired");
            }
        }

        const data: ApiResponse<T> = await response.json();

        if (!response.ok && !data.success) {
            throw new ApiError(data.message || "Request failed", response.status, data.errors);
        }

        return data;
    }

    private async tryRefreshToken(): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE}/auth/refresh-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: this.refreshToken }),
            });

            if (!response.ok) return false;

            const data: ApiResponse<{ accessToken: string; refreshToken: string }> =
                await response.json();

            if (data.success && data.data) {
                this.setTokens(data.data.accessToken, data.data.refreshToken);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    // ── HTTP methods ──

    async get<T>(endpoint: string, params?: Record<string, string | number | undefined>) {
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "")
                    searchParams.append(key, String(value));
            });
            const qs = searchParams.toString();
            if (qs) url += `?${qs}`;
        }
        return this.request<T>(url, { method: "GET" });
    }

    async post<T>(endpoint: string, body?: unknown) {
        return this.request<T>(endpoint, {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: "DELETE" });
    }
}

export class ApiError extends Error {
    status: number;
    errors?: string[];

    constructor(message: string, status: number, errors?: string[]) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

export const apiClient = new ApiClient();
