import crypto from "node:crypto";
import http from "node:http";
import open from "open";
import { AppConfig, StoredToken, saveToken } from "./config.js";

const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

function base64Url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export async function loginWithBrowser(config: AppConfig): Promise<StoredToken> {
  const state = base64Url(crypto.randomBytes(24));
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash("sha256").update(verifier).digest());

  const redirect = new URL(config.redirectUri);
  const port = Number(redirect.port || 80);

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", config.redirectUri);
      if (url.pathname !== redirect.pathname) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const returnedState = url.searchParams.get("state");
      if (returnedState !== state) {
        res.statusCode = 400;
        res.end("State mismatch");
        reject(new Error("OAuth state mismatch"));
        server.close();
        return;
      }

      const authCode = url.searchParams.get("code");
      if (!authCode) {
        res.statusCode = 400;
        res.end("Missing code");
        reject(new Error("Missing auth code"));
        server.close();
        return;
      }

      res.end("WHOOP authentication complete. You can close this tab.");
      resolve(authCode);
      server.close();
    });

    server.listen(port, redirect.hostname, () => {
      const url = new URL(AUTH_URL);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", config.redirectUri);
      url.searchParams.set("scope", config.scopes.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      void open(url.toString());
    });

    server.on("error", (err) => reject(err));
  });

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: verifier
  });

  if (config.clientSecret) body.set("client_secret", config.clientSecret);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as any;
  const token: StoredToken = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: json.expires_in ? Math.floor(Date.now() / 1000) + Number(json.expires_in) : undefined,
    token_type: json.token_type,
    scope: json.scope
  };

  saveToken(token);
  return token;
}
