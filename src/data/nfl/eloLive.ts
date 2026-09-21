import { buildNflTeams, NFL_SCHEDULE, type StoredNflResults } from "./nflLive";
import { NFL_TEAM_BY_CODE } from "./teams";

const K_FACTOR = 32; // Standard NFL Elo K-factor

function expectedWinProbability(elo1: number, elo2: number): number {
  return 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
}

export function buildLiveElos(stored: StoredNflResults = {}): Record<string, number> {
  const baselineTeams = buildNflTeams();
  const eloByCode = new Map(baselineTeams.map((t) => [t.code, t.elo]));

  // Apply actual game results to update Elos
  for (const game of NFL_SCHEDULE) {
    if (game.type !== "REG") continue;
    const result = stored[game.id];
    if (!result) continue;

    const homeElo = eloByCode.get(game.home) ?? 1500;
    const awayElo = eloByCode.get(game.away) ?? 1500;

    const homeWon = result.homeScore > result.awayScore ? 1 : 0;
    const awayWon = result.awayScore > result.homeScore ? 1 : 0;

    const homeExpected = expectedWinProbability(homeElo, awayElo);
    const awayExpected = expectedWinProbability(awayElo, homeElo);

    const newHomeElo = homeElo + K_FACTOR * (homeWon - homeExpected);
    const newAwayElo = awayElo + K_FACTOR * (awayWon - awayExpected);

    eloByCode.set(game.home, newHomeElo);
    eloByCode.set(game.away, newAwayElo);
  }

  return Object.fromEntries(eloByCode);
}

export function getLiveTeamElo(code: string, stored: StoredNflResults = {}): number {
  const elos = buildLiveElos(stored);
  return elos[code] ?? 1500;
}
