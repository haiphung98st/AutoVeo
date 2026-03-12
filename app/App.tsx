import { Outlet } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";

/**
 * Root layout wrapping the entire app with AuthProvider.
 * This ensures all routes (including ProtectedRoute/GuestRoute) 
 * have access to the auth context.
 */
export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
