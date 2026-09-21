import { buildNflStandings, buildNflTeams, NFL_SCHEDULE, fullTeamName, type StoredNflResults } from "./nflLive";

export interface NflBreakingUpdate {
  text: string;
  sport: "nfl";
  resultCount: number;
}

export function buildNflBreakingText(stored: StoredNflResults = {}): NflBreakingUpdate {
  const standings = buildNflStandings(stored);
  const resultCount = Object.keys(stored).length;

  if (resultCount === 0) {
    return {
      text: "NFL 2026 season begins · Veridex model live · Enter results in admin mode to update standings and forecasts",
      sport: "nfl",
      resultCount: 0,
    };
  }

  // Find division leaders
  const leaders: { name: string; conference: string; division: string; wins: number }[] = [];
  for (const divStanding of standings) {
    const leader = divStanding.rows[0];
    if (leader) {
      leaders.push({
        name: leader.name,
        conference: divStanding.conference,
        division: divStanding.division,
        wins: leader.wins,
      });
    }
  }

  // Get the conference leaders (most wins)
  const afcLeaders = leaders.filter((l) => l.conference === "AFC").sort((a, b) => b.wins - a.wins);
  const nflcLeaders = leaders.filter((l) => l.conference === "NFC").sort((a, b) => b.wins - a.wins);

  const afcLeader = afcLeaders[0];
  const nflcLeader = nflcLeaders[0];

  const parts: string[] = [];

  if (afcLeader) {
    parts.push(`${afcLeader.name} leads AFC at ${afcLeader.wins}-0`);
  }
  if (nflcLeader) {
    parts.push(`${nflcLeader.name} leads NFC at ${nflcLeader.wins}-0`);
  }

  parts.push(`${resultCount} results recorded`);
  parts.push(`Veridex model updated`);

  return {
    text: parts.filter(Boolean).join(" · "),
    sport: "nfl",
    resultCount,
  };
}
