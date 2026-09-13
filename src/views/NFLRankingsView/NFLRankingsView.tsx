import { useMemo } from "react";
import { buildNflTeams } from "../../data/nfl/nflLive";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import s from "./NFLRankingsView.module.css";

type Props = {
  stored: StoredNflResults;
};

export function NFLRankingsView({ stored }: Props) {
  const teams = useMemo(() => buildNflTeams(), [stored]);

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h1>Elo Ratings</h1>
      </div>
      <div className={s.teams}>
        {teams.map((team, idx) => (
          <div key={team.code} className={s.teamCard}>
            <div className={s.rank}>{idx + 1}</div>
            <div className={s.name}>{team.name}</div>
            <div className={s.rating}>{team.elo.toFixed(1)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}