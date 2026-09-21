import { createClient } from "@supabase/supabase-js";
import type { StoredResults } from "./types";
import type { StoredNflResults } from "../data/nfl/nflLive";
import { GROUP_MATCHES } from "../data";
import { TEAM_BY_CODE } from "./teams";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function loadOfficialResults(): Promise<StoredResults> {
  const { data, error } = await supabase
    .from("match_results")
    .select("match_id, home_goals, away_goals, penalty_winner");

  if (error) throw error;

  const matches: StoredResults["matches"] = {};
  const knockoutMatches: NonNullable<StoredResults["knockoutMatches"]> = {};

  for (const row of data) {
    const score = {
      homeGoals: row.home_goals,
      awayGoals: row.away_goals,
      ...(row.penalty_winner ? { penaltyWinner: row.penalty_winner as "home" | "away" } : {}),
    };
    if (row.match_id.startsWith("ko-")) {
      knockoutMatches[row.match_id] = score;
    } else {
      matches[row.match_id] = score;
    }
  }

  return { matches, knockoutMatches };
}

export async function loadNflResults(): Promise<StoredNflResults> {
  const { data, error } = await supabase
    .from("match_results")
    .select("match_id, home_goals, away_goals")
    .like("match_id", "nfl-%");

  if (error) throw error;

  const results: StoredNflResults = {};
  for (const row of data) {
    const gameId = row.match_id.replace(/^nfl-/, "");
    results[gameId] = {
      homeScore: row.home_goals,
      awayScore: row.away_goals,
    };
  }
  return results;
}

export async function saveOfficialResult(
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  homeTeam?: string,
  awayTeam?: string,
  matchDate?: string,
  penaltyWinner?: "home" | "away",
): Promise<void> {
  if (!homeTeam && !matchId.startsWith("ko-") && !matchId.startsWith("nfl-")) {
    const match = GROUP_MATCHES.find((m) => m.id === matchId);
    if (match) {
      homeTeam = TEAM_BY_CODE[match.home]?.name;
      awayTeam = TEAM_BY_CODE[match.away]?.name;
      matchDate = match.date;
    }
  }

  await callSaveResultApi({
    action: "save",
    matchId,
    homeTeam: homeTeam ?? null,
    awayTeam: awayTeam ?? null,
    matchDate: matchDate ?? null,
    homeGoals,
    awayGoals,
    penaltyWinner: penaltyWinner ?? null,
  });
}

export async function deleteOfficialResult(matchId: string): Promise<void> {
  await callSaveResultApi({ action: "delete", matchId });
}

// Debug helper to check what's in Supabase
export async function debugGetNflResults(): Promise<void> {
  const { data, error } = await supabase
    .from("match_results")
    .select("match_id, home_goals, away_goals, updated_at")
    .like("match_id", "nfl-%");

  if (error) {
    console.error("Error fetching NFL results from Supabase:", error);
    return;
  }

  console.log(`[DEBUG] Found ${data.length} NFL results in Supabase:`);
  for (const row of data) {
    console.log(`  ${row.match_id}: ${row.home_goals} - ${row.away_goals} (updated: ${row.updated_at})`);
  }
}

export async function loadLatestOfficialResultUpdate() {
  const { data, error } = await supabase
    .from("match_results")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error loading latest official update:", error);
    return null;
  }

  return data?.updated_at ?? null;
}

const ADMIN_SECRET_STORAGE_KEY = "veridex-admin-secret";

function getAdminSecret(): string {
  const stored = localStorage.getItem(ADMIN_SECRET_STORAGE_KEY);
  if (stored) return stored;

  // In development, use a default test secret
  if (import.meta.env.DEV) {
    const testSecret = "dev-test-secret";
    localStorage.setItem(ADMIN_SECRET_STORAGE_KEY, testSecret);
    console.log("[Admin] Using development test secret");
    return testSecret;
  }

  // In production, require the secret to be set
  throw new Error("Admin secret not configured. Set ADMIN_WRITE_SECRET environment variable.");
}

export async function callSaveResultApi(body: Record<string, unknown>): Promise<void> {
  const secret = getAdminSecret();
  const response = await fetch("/api/save-result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, secret }),
  });

  // If API endpoint doesn't exist (404 in dev), fall back to direct Supabase write
  if (response.status === 404) {
    console.warn("API endpoint not available, falling back to direct Supabase write");
    if (body.action === "save") {
      const { matchId, homeGoals, awayGoals } = body as any;
      const { error } = await supabase.from("match_results").upsert({
        match_id: matchId,
        home_goals: homeGoals,
        away_goals: awayGoals,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error("Fallback Supabase write failed:", error);
        throw new Error(`Supabase write failed: ${error.message}`);
      }
      console.log(`[Fallback] ✓ Saved ${matchId} to Supabase`);
    }
    return;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem(ADMIN_SECRET_STORAGE_KEY);
    }
    throw new Error(payload.error ?? `Save failed (${response.status})`);
  }
}