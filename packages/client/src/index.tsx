import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./providers/auth-provider";
import { AppRouter } from "./router";
import { Toaster } from "sonner";
import "./app/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
      <Toaster />
    </AuthProvider>
  </React.StrictMode>,
);
