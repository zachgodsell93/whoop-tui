#!/usr/bin/env node
import chalk from "chalk";
import { cancel, intro, isCancel, log, outro, password, select, text } from "@clack/prompts";
import { loginWithBrowser } from "./auth.js";
import { whoopApi } from "./api.js";
import { AppConfig, clearToken, loadConfig, loadToken, saveConfig } from "./config.js";
import { fmtDate, msToHours } from "./utils.js";

const BAR_WIDTH = 28;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function bar(value: number, max: number, width = BAR_WIDTH, color: (s: string) => string = (s) => s) {
  const safe = clamp(value, 0, max);
  const fill = Math.round((safe / max) * width);
  const empty = Math.max(0, width - fill);
  return color("█".repeat(fill)) + chalk.gray("░".repeat(empty));
}

function dayLabel(iso?: string) {
  if (!iso) return "unknown";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

async function setupConfig(): Promise<AppConfig> {
  const clientId = await text({
    message: "Whoop OAuth Client ID",
    placeholder: "Paste from developer.whoop.com app settings"
  });

  if (isCancel(clientId)) throw new Error("Cancelled");

  const clientSecret = await password({
    message: "Whoop OAuth Client Secret (optional for PKCE clients)",
    mask: "*"
  });

  if (isCancel(clientSecret)) throw new Error("Cancelled");

  const redirectUri = await text({
    message: "Redirect URI (must match your Whoop app)",
    initialValue: "http://127.0.0.1:8787/callback"
  });

  if (isCancel(redirectUri)) throw new Error("Cancelled");

  const config: AppConfig = {
    clientId: String(clientId),
    clientSecret: String(clientSecret || "") || undefined,
    redirectUri: String(redirectUri),
    scopes: ["read:profile", "read:sleep", "read:recovery", "read:cycles"]
  };

  saveConfig(config);
  return config;
}

function printSleep(records: any[]) {
  console.log(chalk.bold("\n😴 Sleep (last 14)"));
  for (const r of records) {
    const perf = Number(r.score?.sleep_performance_percentage ?? 0);
    const eff = Number(r.score?.sleep_efficiency_percentage ?? 0);
    const inBedMs = Number(r.score?.stage_summary?.total_in_bed_time_milli ?? 0);
    const inBedHours = inBedMs / 3_600_000;

    console.log(chalk.cyan(`\n${dayLabel(r.start)}  ${fmtDate(r.start)} → ${fmtDate(r.end)}`));
    console.log(`  perf  ${bar(perf, 100, BAR_WIDTH, chalk.blue)} ${String(perf).padStart(3)}%`);
    console.log(`  eff   ${bar(eff, 100, BAR_WIDTH, chalk.green)} ${String(Math.round(eff)).padStart(3)}%`);
    console.log(`  bed   ${bar(inBedHours, 12, BAR_WIDTH, chalk.magenta)} ${inBedHours.toFixed(1)}h`);
    console.log(`  awake ${msToHours(r.score?.stage_summary?.total_awake_time_milli)} | disturbances: ${r.score?.stage_summary?.disturbance_count ?? "-"}`);
  }
}

function printRecovery(records: any[]) {
  console.log(chalk.bold("\n💚 Recovery (last 14)"));

  const hrvValues = records
    .map((r) => Number(r.score?.hrv_rmssd_milli ?? 0))
    .filter((v) => Number.isFinite(v) && v > 0);
  const hrvMax = Math.max(60, ...hrvValues);

  for (const r of records) {
    const rec = Number(r.score?.recovery_score ?? 0);
    const hrv = Number(r.score?.hrv_rmssd_milli ?? 0);

    console.log(chalk.cyan(`\n${dayLabel(r.created_at)}  ${fmtDate(r.created_at)}`));
    console.log(`  rec   ${bar(rec, 100, BAR_WIDTH, chalk.green)} ${String(rec).padStart(3)}%`);
    console.log(`  hrv   ${bar(hrv, hrvMax, BAR_WIDTH, chalk.yellow)} ${hrv ? hrv.toFixed(1) : "-"} ms`);
    console.log(`  RHR: ${r.score?.resting_heart_rate ?? "-"} bpm | SpO2: ${r.score?.spo2_percentage ?? "-"}%`);
  }
}

function printStrain(records: any[]) {
  console.log(chalk.bold("\n⚡ Strain (last 14 cycles)"));
  for (const r of records) {
    const strain = Number(r.score?.strain ?? 0);
    console.log(chalk.cyan(`\n${dayLabel(r.start)}  ${fmtDate(r.start)}`));
    console.log(`  strain ${bar(strain, 21, BAR_WIDTH, chalk.red)} ${strain ? strain.toFixed(1) : "-"}`);
    console.log(`  avg HR: ${r.score?.average_heart_rate ?? "-"} bpm | max HR: ${r.score?.max_heart_rate ?? "-"} bpm`);
  }
}

async function main() {
  intro("WHOOP Terminal UI");

  let config = loadConfig();
  if (!config) {
    log.info("No config found. Running first-time setup.");
    config = await setupConfig();
  }

  let token = loadToken();

  while (true) {
    const action = await select({
      message: "Choose an action",
      options: [
        { value: "login", label: "Login / Refresh session" },
        { value: "profile", label: "View profile" },
        { value: "sleep", label: "View sleep data" },
        { value: "recovery", label: "View recovery data" },
        { value: "strain", label: "View strain (cycle) data" },
        { value: "reconfigure", label: "Update OAuth config" },
        { value: "logout", label: "Logout (clear local token)" },
        { value: "exit", label: "Exit" }
      ]
    });

    if (isCancel(action) || action === "exit") break;

    try {
      switch (action) {
        case "login":
          log.step("Opening browser for Whoop login...");
          token = await loginWithBrowser(config);
          log.success("Login successful. Token stored locally.");
          break;
        case "profile": {
          if (!token) throw new Error("Not logged in. Run Login first.");
          const profile = await whoopApi.getProfile(token, config);
          console.log(chalk.bold("\nProfile"));
          console.log(`• ${profile.first_name} ${profile.last_name}`);
          console.log(`• ${profile.email}`);
          console.log(`• user_id: ${profile.user_id}`);
          break;
        }
        case "sleep": {
          if (!token) throw new Error("Not logged in. Run Login first.");
          const data = await whoopApi.getSleep(token, config, 14);
          printSleep(data.records);
          break;
        }
        case "recovery": {
          if (!token) throw new Error("Not logged in. Run Login first.");
          const data = await whoopApi.getRecovery(token, config, 14);
          printRecovery(data.records);
          break;
        }
        case "strain": {
          if (!token) throw new Error("Not logged in. Run Login first.");
          const data = await whoopApi.getCycles(token, config, 14);
          printStrain(data.records);
          break;
        }
        case "reconfigure":
          config = await setupConfig();
          log.success("Config saved.");
          break;
        case "logout":
          clearToken();
          token = null;
          log.success("Local token removed.");
          break;
      }
    } catch (err: any) {
      log.error(err?.message ?? "Unknown error");
    }
  }

  outro("Done.");
}

main().catch((err) => {
  cancel(String(err?.message ?? err));
  process.exit(1);
});
