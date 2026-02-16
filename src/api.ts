import { AppConfig, StoredToken, saveToken } from "./config.js";
import { CycleRecord, RecoveryRecord, SleepRecord, WhoopCollection } from "./types.js";

const BASE = "https://api.prod.whoop.com/developer/v2";

type FetchOptions = {
  path: string;
  token: StoredToken;
  config: AppConfig;
  query?: Record<string, string | number | undefined>;
};

async function refreshToken(config: AppConfig, token: StoredToken): Promise<StoredToken> {
  if (!token.refresh_token) throw new Error("No refresh token available. Please login again.");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
    client_id: config.clientId
  });

  if (config.clientSecret) body.set("client_secret", config.clientSecret);

  const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as any;
  const next: StoredToken = {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? token.refresh_token,
    expires_at: json.expires_in ? Math.floor(Date.now() / 1000) + Number(json.expires_in) : token.expires_at,
    token_type: json.token_type,
    scope: json.scope
  };

  saveToken(next);
  return next;
}

export async function authorizedFetch<T>(opts: FetchOptions): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(opts.query ?? {})) {
    if (val !== undefined) params.set(key, String(val));
  }

  const run = async (accessToken: string) => {
    const res = await fetch(`${BASE}${opts.path}${params.toString() ? `?${params.toString()}` : ""}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return res;
  };

  let res = await run(opts.token.access_token);

  if (res.status === 401 && opts.token.refresh_token) {
    const refreshed = await refreshToken(opts.config, opts.token);
    res = await run(refreshed.access_token);
  }

  if (!res.ok) throw new Error(`API error: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export const whoopApi = {
  getProfile: (token: StoredToken, config: AppConfig) =>
    authorizedFetch<any>({ path: "/user/profile/basic", token, config }),
  getSleep: (token: StoredToken, config: AppConfig, limit = 7) =>
    authorizedFetch<WhoopCollection<SleepRecord>>({ path: "/activity/sleep", token, config, query: { limit } }),
  getRecovery: (token: StoredToken, config: AppConfig, limit = 7) =>
    authorizedFetch<WhoopCollection<RecoveryRecord>>({ path: "/recovery", token, config, query: { limit } }),
  getCycles: (token: StoredToken, config: AppConfig, limit = 7) =>
    authorizedFetch<WhoopCollection<CycleRecord>>({ path: "/cycle", token, config, query: { limit } })
};
