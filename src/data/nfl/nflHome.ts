import { NFL_SCHEDULE, buildNflTeams, fullTeamName, getNflWeekProgress } from "./nflLive";
import type { NflGame, StoredNflResults } from "./nflLive";
import type { Headline, MorningForecast } from "../worldCup";

export type PlayedGame = NflGame & {
  homeScore: number;
  awayScore: number;
  winner: string | null;
  loser: string | null;
};

type TeamLine = {
  code: string;
  wins: number;
  losses: number;
  ties: number;
  streak: number;
  surprise: number;
};

const DEFAULT_ELO = 1500;
const UPSET_MIN_GAP = 25;

function expectedWin(own: number, opp: number): number {
  return 1 / (1 + Math.pow(10, (opp - own) / 400));
}

function eloMap(): Map<string, number> {
  return new Map(buildNflTeams().map((t) => [t.code, Math.round(t.elo)]));
}

function playedGames(stored: StoredNflResults): PlayedGame[] {
  return NFL_SCHEDULE.filter((g) => g.type === "REG" && stored[g.id])
    .map((g) => {
      const r = stored[g.id];
      const winner = r.homeScore > r.awayScore ? g.home : r.awayScore > r.homeScore ? g.away : null;
      const loser = winner === null ? null : winner === g.home ? g.away : g.home;
      return { ...g, homeScore: r.homeScore, awayScore: r.awayScore, winner, loser };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function upsetsIn(games: PlayedGame[], elo: Map<string, number>) {
  return games.flatMap((game) => {
    if (!game.winner || !game.loser) return [];
    const gap = (elo.get(game.loser) ?? DEFAULT_ELO) - (elo.get(game.winner) ?? DEFAULT_ELO);
    return gap >= UPSET_MIN_GAP
      ? [{ game, winner: game.winner, loser: game.loser, gap }]
      : [];
  });
}

function matchGap(g: PlayedGame, elo: Map<string, number>): number {
  return Math.abs((elo.get(g.home) ?? DEFAULT_ELO) - (elo.get(g.away) ?? DEFAULT_ELO));
}

/**
 * Chance the underdog wins, from PRESEASON Elo (buildNflTeams reads the static
 * baseline, not in-season results). It is not a live pre-kickoff forecast, so
 * the copy says "preseason ratings".
 */
function underdogWinChance(gap: number): number {
  return Math.round((1 / (1 + Math.pow(10, gap / 400))) * 100);
}

function teamLines(games: PlayedGame[], elo: Map<string, number>): Map<string, TeamLine> {
  const lines = new Map<string, TeamLine>();
  const line = (code: string): TeamLine => {
    let l = lines.get(code);
    if (!l) {
      l = { code, wins: 0, losses: 0, ties: 0, streak: 0, surprise: 0 };
      lines.set(code, l);
    }
    return l;
  };

  // games are sorted by date, so the final streak value is the current streak
  for (const g of games) {
    const sides = [
      { own: g.home, opp: g.away, ownScore: g.homeScore, oppScore: g.awayScore },
      { own: g.away, opp: g.home, ownScore: g.awayScore, oppScore: g.homeScore },
    ];
    for (const side of sides) {
      const l = line(side.own);
      const actual = side.ownScore > side.oppScore ? 1 : side.ownScore < side.oppScore ? 0 : 0.5;
      if (actual === 1) l.wins++;
      else if (actual === 0) l.losses++;
      else l.ties++;
      l.streak = actual === 1 ? l.streak + 1 : 0;
      l.surprise += actual - expectedWin(elo.get(side.own) ?? DEFAULT_ELO, elo.get(side.opp) ?? DEFAULT_ELO);
    }
  }
  return lines;
}

const isUnbeaten = (l: TeamLine) => l.wins >= 2 && l.losses === 0 && l.ties === 0;

/** Home-page stories, best first. The first item is the hero. */
export function buildNflHomeHeadlines(stored: StoredNflResults): Headline[] {
  const games = playedGames(stored);
  if (games.length === 0) return [];

  const elo = eloMap();
  const lines = [...teamLines(games, elo).values()];
  const latestWeek = Math.max(...games.map((g) => g.week));
  const progress = getNflWeekProgress(stored).find((p) => p.week === latestWeek);
  const scored: { score: number; headline: Headline }[] = [];

  const topUpsets = [...upsetsIn(games, elo)]
    .map((u) => ({ ...u, score: u.gap + (u.game.week === latestWeek ? 100 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  for (const u of topUpsets) {
    const winScore = u.winner === u.game.home ? u.game.homeScore : u.game.awayScore;
    const loseScore = u.winner === u.game.home ? u.game.awayScore : u.game.homeScore;
    const chance = underdogWinChance(u.gap);
    scored.push({
      score: u.score,
      headline: {
        title: `${fullTeamName(u.winner)} Upset ${fullTeamName(u.loser)}`,
        summary: `${fullTeamName(u.winner)} won ${winScore}–${loseScore}. Preseason ratings gave them a ${chance}% chance.`,
        metric: `${chance}%`,
        metricLabel: "Preseason win chance",
        up: true,
      },
    });
  }

  for (const l of lines.filter(isUnbeaten).slice(0, 3)) {
    scored.push({
      score: 80 + l.wins * 5,
      headline: {
        title: `${fullTeamName(l.code)} Remain Unbeaten`,
        summary: `Still perfect through ${l.wins} games this season.`,
        metric: `${l.wins}-0`,
        metricLabel: "Record",
        up: true,
      },
    });
  }

  for (const l of lines.filter((l) => l.streak >= 3 && !isUnbeaten(l)).slice(0, 2)) {
    scored.push({
      score: 60 + l.streak * 5,
      headline: {
        title: `${fullTeamName(l.code)} Ride a ${l.streak}-Game Win Streak`,
        summary: `${fullTeamName(l.code)} have won ${l.streak} straight.`,
        metric: `${l.streak}W`,
        metricLabel: "Current streak",
        up: true,
      },
    });
  }

  scored.push({
    score: 0,
    headline: {
      title: `Week ${latestWeek} Results In`,
      summary: `${progress?.played ?? 0} of ${progress?.total ?? 0} games scored so far.`,
      metric: `${progress?.played ?? 0}/${progress?.total ?? 0}`,
      metricLabel: "Games scored",
      up: true,
    },
  });

  return scored.sort((a, b) => b.score - a.score).map((s) => s.headline);
}

/** Briefing cells built from NFL results. Replaces the saved World Cup briefing. */
export function buildNflMorningForecast(stored: StoredNflResults): MorningForecast | null {
  const games = playedGames(stored);
  if (games.length === 0) return null;

  const elo = eloMap();
  const lines = [...teamLines(games, elo).values()];
  const latestWeek = Math.max(...games.map((g) => g.week));
  const totalGames = getNflWeekProgress(stored).reduce((n, p) => n + p.total, 0);

  const bySurprise = [...lines].sort((a, b) => b.surprise - a.surprise);
  const riser = bySurprise[0];
  const faller = bySurprise[bySurprise.length - 1];
  const topUpset = [...upsetsIn(games, elo)].sort((a, b) => b.gap - a.gap)[0];
  const topRated = [...elo.entries()].sort((a, b) => b[1] - a[1])[0];
  const closest = games
    .filter((g) => g.week === latestWeek)
    .sort((a, b) => matchGap(a, elo) - matchGap(b, elo))[0];

  const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;

  return {
    riser: fullTeamName(riser.code),
    riserVal: signed(riser.surprise),
    riserNote: `${riser.wins}-${riser.losses} record, ahead of expectations`,
    faller: fullTeamName(faller.code),
    fallerVal: signed(faller.surprise),
    fallerNote: `${faller.wins}-${faller.losses} record, behind expectations`,
    matchName: `${fullTeamName(closest.away)} at ${fullTeamName(closest.home)}`,
    matchNote: `Final ${closest.awayScore}–${closest.homeScore}. Closest pre-game ratings of Week ${latestWeek}.`,
    champ: fullTeamName(topRated[0]),
    champVal: `${Math.round(topRated[1])}`,
    champNote: "Highest pre-season power rating",
    upset: topUpset ? fullTeamName(topUpset.winner) : "No upsets yet",
    upsetVal: topUpset ? `${underdogWinChance(topUpset.gap)}%` : "",
    upsetNote: topUpset
      ? `Beat ${fullTeamName(topUpset.loser)} in Week ${topUpset.game.week}. Preseason ratings gave them ${underdogWinChance(topUpset.gap)}%.`
      : "Favorites have won every game so far",
    insight: `${games.length} of ${totalGames} regular-season games scored.`,
    isComplete: false,
  };
}

export type NflHighlight = { game: PlayedGame; reason: string };

/** Up to four games from the most recent scored week. */
export function buildNflWeekHighlights(stored: StoredNflResults): {
  week: number;
  played: number;
  total: number;
  highlights: NflHighlight[];
} | null {
  const games = playedGames(stored);
  if (games.length === 0) return null;

  const elo = eloMap();
  const lines = [...teamLines(games, elo).values()];
  const week = Math.max(...games.map((g) => g.week));
  const weekGames = games.filter((g) => g.week === week);
  const progress = getNflWeekProgress(stored).find((p) => p.week === week);
  const unbeaten = new Set(lines.filter(isUnbeaten).map((l) => l.code));

  const highlights: NflHighlight[] = [];
  const add = (game: PlayedGame, reason: string) => {
    if (highlights.length < 4 && !highlights.some((h) => h.game.id === game.id)) {
      highlights.push({ game, reason });
    }
  };

  // Top two upsets only, so the card doesn't fill with upsets.
  [...upsetsIn(weekGames, elo)]
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 2)
    .forEach((u) => add(u.game, "Upset"));
  weekGames
    .filter((g) => unbeaten.has(g.home) || unbeaten.has(g.away))
    .forEach((g) => add(g, "Unbeaten team"));
  [...weekGames].sort((a, b) => matchGap(a, elo) - matchGap(b, elo)).forEach((g) => add(g, "Evenly matched"));
  [...weekGames]
    .sort((a, b) => Math.abs(a.homeScore - a.awayScore) - Math.abs(b.homeScore - b.awayScore))
    .forEach((g) => add(g, "Nail-biter"));

  return {
    week,
    played: progress?.played ?? weekGames.length,
    total: progress?.total ?? weekGames.length,
    highlights,
  };
}