import { Navigate, Outlet } from "react-router";
import { useAuth } from "../contexts/AuthContext";

/**
 * Wraps protected routes — redirects to /login if not authenticated.
 * Shows a loading spinner while auth state is initializing.
 */
export function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F0F18] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

/**
 * Wraps auth routes (login/register) — redirects to / if already authenticated.
 */
export function GuestRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F0F18] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
