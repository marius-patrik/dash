import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/index.tsx",
    },
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
      ),
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
      ),
      "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
      ),
      "process.env.NEXT_PUBLIC_WS_URL": JSON.stringify(
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
      ),
    },
  },
  html: {
    template: "./src/index.html",
    title: "Dash — AI Agent Dashboard",
  },
  output: {
    distPath: {
      root: "dist",
    },
    assetPrefix: "/",
  },
  tools: {
    postcss: {
      postcssOptions: {
        plugins: [require("@tailwindcss/postcss")],
      },
    },
  },
  server: {
    port: 3000,
    historyApiFallback: true,
  },
});
