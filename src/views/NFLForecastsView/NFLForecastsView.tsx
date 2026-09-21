import { useMemo } from "react";
import { fullTeamName } from "../../data/nfl/nflLive";
import { buildLiveForecast } from "../../data/nfl/forecastLive";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import s from "./NFLForecastsView.module.css";

type Props = {
  stored: StoredNflResults;
};

const SIMULATIONS = 5000;

export function NFLForecastsView({ stored }: Props) {
  const forecasts = useMemo(() => buildLiveForecast(stored), [stored]);

  return (
    <>
      <section className={s.header}>
        <h1>2026 Season Forecast</h1>
        <p>
          {SIMULATIONS.toLocaleString()} simulated seasons from current standings. Includes actual results played so far
          and projects remaining games using live Elo ratings. Playoff seeding follows real rules (division winners, wildcards).
          Updates as scores are entered.
        </p>
      </section>

      <section className={s.section}>
        <div className={s.tableHeader}>
          <span className={s.colTeam}>Team</span>
          <span>Proj. Wins</span>
          <span>Playoffs</span>
          <span>Division</span>
          <span>Conf. Champ</span>
          <span>Super Bowl</span>
        </div>
        {forecasts.map((f, i) => (
          <div className={s.row} key={f.code}>
            <span className={s.colTeam}>
              <span className={s.rank}>{i + 1}</span>
              {fullTeamName(f.code)}
            </span>
            <span className={s.num} data-label="Proj. Wins">{f.projectedWins}</span>
            <span className={s.num} data-label="Playoffs">{f.playoffPct}%</span>
            <span className={s.num} data-label="Division">{f.divisionPct}%</span>
            <span className={s.num} data-label="Conf. Champ">{f.conferencePct}%</span>
            <span className={s.numStrong} data-label="Super Bowl">{f.superBowlPct}%</span>
          </div>
        ))}
      </section>
    </>
  );
}