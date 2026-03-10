import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import { ConvexProvider } from "./providers/convex-provider";
import { AppRouter } from "./router";
import "./app/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider>
      <AppRouter />
      <Toaster />
    </ConvexProvider>
  </React.StrictMode>,
);
