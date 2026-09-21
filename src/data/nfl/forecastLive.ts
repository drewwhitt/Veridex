import { buildLiveElos } from "./eloLive";
import { buildNflStandings, NFL_SCHEDULE, type StoredNflResults } from "./nflLive";
import { NFL_TEAMS } from "./teams";

const K_FACTOR = 32;
const SIMULATIONS = 5000;

function expectedWinProbability(elo1: number, elo2: number): number {
  return 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
}

function simulateGame(homeElo: number, awayElo: number, rng: () => number): boolean {
  const homeWinProb = expectedWinProbability(homeElo, awayElo);
  return rng() < homeWinProb;
}

export interface LiveForecast {
  code: string;
  projectedWins: number;
  playoffPct: number;
  divisionPct: number;
  conferencePct: number;
  superBowlPct: number;
}

export function buildLiveForecast(stored: StoredNflResults = {}): LiveForecast[] {
  const standings = buildNflStandings(stored);
  const liveElos = buildLiveElos(stored);

  // Count games played and remaining
  const gamesPlayed = new Map<string, number>();
  const gameResults = new Map<string, { wins: number; losses: number }>();

  for (const game of NFL_SCHEDULE) {
    if (game.type !== "REG") continue;
    const result = stored[game.id];

    gamesPlayed.set(game.home, (gamesPlayed.get(game.home) ?? 0) + 1);
    gamesPlayed.set(game.away, (gamesPlayed.get(game.away) ?? 0) + 1);

    if (!result) continue;
    const homeWon = result.homeScore > result.awayScore;
    if (!gameResults.has(game.home)) gameResults.set(game.home, { wins: 0, losses: 0 });
    if (!gameResults.has(game.away)) gameResults.set(game.away, { wins: 0, losses: 0 });

    if (homeWon) {
      gameResults.get(game.home)!.wins++;
      gameResults.get(game.away)!.losses++;
    } else {
      gameResults.get(game.home)!.losses++;
      gameResults.get(game.away)!.wins++;
    }
  }

  // Run simulations
  const outcomes = new Map<string, {
    playoff: number;
    division: number;
    conference: number;
    superBowl: number;
    projectedWins: number;
  }>();

  for (const team of NFL_TEAMS) {
    outcomes.set(team.code, {
      playoff: 0,
      division: 0,
      conference: 0,
      superBowl: 0,
      projectedWins: 0,
    });
  }

  const seededRng = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  for (let sim = 0; sim < SIMULATIONS; sim++) {
    const simRecord = new Map<string, { wins: number; losses: number; division: string; conference: string }>();

    for (const team of NFL_TEAMS) {
      const current = gameResults.get(team.code) ?? { wins: 0, losses: 0 };
      simRecord.set(team.code, {
        wins: current.wins,
        losses: current.losses,
        division: team.division,
        conference: team.conference,
      });
    }

    // Simulate remaining games
    for (const game of NFL_SCHEDULE) {
      if (game.type !== "REG") continue;
      if (stored[game.id]) continue; // Already played

      const homeElo = liveElos[game.home] ?? 1500;
      const awayElo = liveElos[game.away] ?? 1500;
      const homeWins = simulateGame(homeElo, awayElo, () => seededRng(sim * 1000 + Math.random()));

      const homeRecord = simRecord.get(game.home)!;
      const awayRecord = simRecord.get(game.away)!;

      if (homeWins) {
        homeRecord.wins++;
        awayRecord.losses++;
      } else {
        homeRecord.losses++;
        awayRecord.wins++;
      }
    }

    // Determine division winners and playoff teams
    const divisionWinners = new Map<string, string>(); // division -> team code
    const conferenceWildcards = new Map<string, string[]>(); // conference -> [team codes]

    for (const conf of ["AFC", "NFC"]) {
      conferenceWildcards.set(conf, []);
    }

    // Get division winners
    for (const division of ["East", "North", "South", "West"]) {
      for (const conf of ["AFC", "NFC"]) {
        const divisionTeams = NFL_TEAMS.filter((t) => t.conference === conf && t.division === division);
        const best = divisionTeams.reduce((max, t) => {
          const rec1 = simRecord.get(max.code)!;
          const rec2 = simRecord.get(t.code)!;
          return rec1.wins > rec2.wins ? max : t;
        });
        divisionWinners.set(`${conf}-${division}`, best.code);
      }
    }

    // Get wildcard teams (best remaining teams in conference)
    for (const conf of ["AFC", "NFC"]) {
      const confTeams = NFL_TEAMS.filter((t) => t.conference === conf);
      const nonWinners = confTeams.filter((t) => !Array.from(divisionWinners.values()).includes(t.code));
      const sortedByRecord = nonWinners.sort((a, b) => {
        const recA = simRecord.get(a.code)!;
        const recB = simRecord.get(b.code)!;
        return recB.wins - recA.wins;
      });

      const wildcards = sortedByRecord.slice(0, 3);
      conferenceWildcards.get(conf)!.push(...wildcards.map((t) => t.code));
    }

    // Count playoff teams
    const playoffTeams = new Set([...divisionWinners.values(), ...conferenceWildcards.get("AFC")!, ...conferenceWildcards.get("NFC")!]);

    for (const code of playoffTeams) {
      outcomes.get(code)!.playoff++;
    }

    // Simple conference probability (best team per conference makes it)
    const afcBest = NFL_TEAMS.filter((t) => t.conference === "AFC").reduce((max, t) => {
      const rec1 = simRecord.get(max.code)!;
      const rec2 = simRecord.get(t.code)!;
      return rec1.wins > rec2.wins ? max : t;
    });
    const nflcBest = NFL_TEAMS.filter((t) => t.conference === "NFC").reduce((max, t) => {
      const rec1 = simRecord.get(max.code)!;
      const rec2 = simRecord.get(t.code)!;
      return rec1.wins > rec2.wins ? max : t;
    });

    outcomes.get(afcBest.code)!.conference++;
    outcomes.get(nflcBest.code)!.conference++;

    // Simple Super Bowl (best overall team)
    const overall = NFL_TEAMS.reduce((max, t) => {
      const rec1 = simRecord.get(max.code)!;
      const rec2 = simRecord.get(t.code)!;
      return rec1.wins > rec2.wins ? max : t;
    });

    outcomes.get(overall.code)!.superBowl++;

    // Track projected wins
    for (const [code, record] of simRecord) {
      outcomes.get(code)!.projectedWins += record.wins;
    }

    // Division probability (division winner)
    for (const [divKey, winner] of divisionWinners) {
      outcomes.get(winner)!.division++;
    }
  }

  // Convert outcomes to percentages and build forecast
  const forecast: LiveForecast[] = NFL_TEAMS.map((team) => {
    const outcome = outcomes.get(team.code)!;
    return {
      code: team.code,
      playoffPct: Math.round((outcome.playoff / SIMULATIONS) * 100),
      divisionPct: Math.round((outcome.division / SIMULATIONS) * 100),
      conferencePct: Math.round((outcome.conference / SIMULATIONS) * 100),
      superBowlPct: Math.round((outcome.superBowl / SIMULATIONS) * 100),
      projectedWins: Math.round((outcome.projectedWins / SIMULATIONS) * 10) / 10,
    };
  });

  return forecast.sort((a, b) => b.superBowlPct - a.superBowlPct);
}
