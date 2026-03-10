export const DEFAULT_MODEL = "claude-sonnet-4-6";

export const AVAILABLE_MODELS = [
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", description: "Most capable" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Balanced" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Fast & affordable" },
] as const;

export const BUILT_IN_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "Agent",
  "TodoWrite",
] as const;

export const SKILL_CATEGORIES = [
  "coding",
  "writing",
  "research",
  "analysis",
  "automation",
  "other",
] as const;

export const MEMORY_CATEGORIES = [
  "preference",
  "project",
  "knowledge",
  "context",
  "other",
] as const;
