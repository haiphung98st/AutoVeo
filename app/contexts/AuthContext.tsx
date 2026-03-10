import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { UserDto } from "../types/api";
import { authApi } from "../services/api";
import { apiClient } from "../services/apiClient";

interface AuthContextType {
    user: UserDto | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        const token = apiClient.getAccessToken();
        const savedUser = localStorage.getItem("user");
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                apiClient.clearTokens();
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const response = await authApi.login({
            email,
            password,
            deviceInfo: navigator.userAgent,
        });
        const { accessToken, refreshToken, user: userData } = response.data;
        apiClient.setTokens(accessToken, refreshToken);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
    };

    const register = async (
        fullName: string,
        email: string,
        password: string,
        confirmPassword: string
    ) => {
        const response = await authApi.register({
            fullName,
            email,
            password,
            confirmPassword,
        });
        const { accessToken, refreshToken, user: userData } = response.data;
        apiClient.setTokens(accessToken, refreshToken);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
    };

    const forgotPassword = async (email: string) => {
        await authApi.forgotPassword({ email });
    };

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch {
            // Ignore logout errors
        } finally {
            apiClient.clearTokens();
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                forgotPassword,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}
