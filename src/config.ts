import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

const ConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1).optional(),
  redirectUri: z.string().url().default("http://127.0.0.1:8787/callback"),
  scopes: z.array(z.string()).default([
    "read:profile",
    "read:sleep",
    "read:recovery",
    "read:cycles"
  ])
});

const TokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_at: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional()
});

export type AppConfig = z.infer<typeof ConfigSchema>;
export type StoredToken = z.infer<typeof TokenSchema>;

const DIR = path.join(os.homedir(), ".whoop-tui");
const CONFIG_PATH = path.join(DIR, "config.json");
const TOKEN_PATH = path.join(DIR, "token.json");

export function ensureDataDir() {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
}

export function loadConfig(): AppConfig | null {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return ConfigSchema.parse(JSON.parse(raw));
}

export function saveConfig(config: AppConfig) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function loadToken(): StoredToken | null {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  const raw = fs.readFileSync(TOKEN_PATH, "utf8");
  return TokenSchema.parse(JSON.parse(raw));
}

export function saveToken(token: StoredToken) {
  ensureDataDir();
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), { mode: 0o600 });
}

export function clearToken() {
  if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
}

export const paths = { DIR, CONFIG_PATH, TOKEN_PATH };
