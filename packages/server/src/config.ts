import { DEFAULT_PORT } from "@dash/shared";

export const config = {
  port: parseInt(process.env.PORT || String(DEFAULT_PORT), 10),
  host: process.env.HOST || "0.0.0.0",

  // Claude auth — OAuth token (Max subscription) takes priority over API key
  claudeOAuthToken: process.env.CLAUDE_CODE_OAUTH_TOKEN,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || "",

  // Path to Rsbuild output (built client)
  clientDistPath: process.env.CLIENT_DIST_PATH || "../../client/dist",

  get hasClaudeAuth(): boolean {
    return !!(this.claudeOAuthToken || this.anthropicApiKey);
  },

  get hasSupabase(): boolean {
    return !!(this.supabaseUrl && this.supabaseAnonKey);
  },
};
