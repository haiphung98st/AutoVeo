import { createBrowserRouter } from "react-router";
import { Dashboard } from "./screens/Dashboard";
import { TrendExplorer } from "./screens/TrendExplorer";
import { PromptGenerator } from "./screens/PromptGenerator";
import { VideoRender } from "./screens/VideoRender";
import { Library } from "./screens/Library";
import { Login } from "./screens/Login";
import { Register } from "./screens/Register";
import { ForgotPassword } from "./screens/ForgotPassword";

export const router = createBrowserRouter([
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
]);