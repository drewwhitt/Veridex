import { useMemo } from "react";
import { buildNflTeams } from "../../data/nfl/nflLive";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import s from "./NFLForecastsView.module.css";

type Props = {
  stored: StoredNflResults;
};

export function NFLForecastsView({ stored }: Props) {
  const teams = useMemo(() => buildNflTeams(), [stored]);

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h1>Forecasts</h1>
        <p className={s.subtitle}>Playoff simulations coming soon</p>
      </div>
      <div className={s.teams}>
        {teams.map((team) => (
          <div key={team.code} className={s.teamCard}>
            <div className={s.name}>{team.name}</div>
            <div className={s.elo}>{team.elo.toFixed(0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}