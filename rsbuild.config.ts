import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/index.tsx",
    },
    define: {
      "process.env.NEXT_PUBLIC_CONVEX_URL": JSON.stringify(
        process.env.NEXT_PUBLIC_CONVEX_URL || "",
      ),
      "process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": JSON.stringify(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
      ),
    },
  },
  html: {
    template: "./src/index.html",
    title: "Dash — AI Agent Dashboard",
  },
  output: {
    distPath: { root: "dist" },
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
