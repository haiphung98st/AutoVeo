import { createBrowserRouter } from "react-router";
import App from "./App";
import { Dashboard } from "./screens/Dashboard";
import { TrendExplorer } from "./screens/TrendExplorer";
import { PromptGenerator } from "./screens/PromptGenerator";
import { VideoRender } from "./screens/VideoRender";
import { Library } from "./screens/Library";
import { Login } from "./screens/Login";
import { Register } from "./screens/Register";
import { ForgotPassword } from "./screens/ForgotPassword";
import { ProtectedRoute, GuestRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    // Root layout: wraps everything with AuthProvider
    Component: App,
    children: [
      // ── Protected routes (require login) ──
      {
        Component: ProtectedRoute,
        children: [
          {
            path: "/",
            Component: Dashboard,
          },
          {
            path: "/trends",
            Component: TrendExplorer,
          },
          {
            path: "/prompt-engine",
            Component: PromptGenerator,
          },
          {
            path: "/render",
            Component: VideoRender,
          },
          {
            path: "/library",
            Component: Library,
          },
        ],
      },
      // ── Guest routes (redirect to / if already logged in) ──
      {
        Component: GuestRoute,
        children: [
          {
            path: "/login",
            Component: Login,
          },
          {
            path: "/register",
            Component: Register,
          },
          {
            path: "/forgot-password",
            Component: ForgotPassword,
          },
        ],
      },
    ],
  },
]);