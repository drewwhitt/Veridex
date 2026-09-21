import { useMemo, useState } from "react";
import { fullTeamName } from "../../data/nfl/nflLive";
import { buildLiveForecast } from "../../data/nfl/forecastLive";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import s from "./NFLForecastsView.module.css";

type Props = {
  stored: StoredNflResults;
};

const SIMULATIONS = 5000;
type SortKey = "superBowl" | "projectedWins" | "playoff" | "division" | "conference";

export function NFLForecastsView({ stored }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("superBowl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const baseForecast = useMemo(() => buildLiveForecast(stored), [stored]);

  const forecasts = useMemo(() => {
    const sorted = [...baseForecast];
    const dirMult = sortDir === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let valA = 0, valB = 0;
      switch (sortKey) {
        case "superBowl":
          valA = a.superBowlPct;
          valB = b.superBowlPct;
          break;
        case "projectedWins":
          valA = a.projectedWins;
          valB = b.projectedWins;
          break;
        case "playoff":
          valA = a.playoffPct;
          valB = b.playoffPct;
          break;
        case "division":
          valA = a.divisionPct;
          valB = b.divisionPct;
          break;
        case "conference":
          valA = a.conferencePct;
          valB = b.conferencePct;
          break;
      }
      return (valA - valB) * dirMult;
    });

    return sorted;
  }, [baseForecast, sortKey, sortDir]);

  function handleHeaderClick(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

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
          <button
            type="button"
            className={`${s.headerBtn} ${sortKey === "projectedWins" ? s.active : ""}`}
            onClick={() => handleHeaderClick("projectedWins")}
          >
            Proj. Wins {sortKey === "projectedWins" && (sortDir === "desc" ? "▾" : "▴")}
          </button>
          <button
            type="button"
            className={`${s.headerBtn} ${sortKey === "playoff" ? s.active : ""}`}
            onClick={() => handleHeaderClick("playoff")}
          >
            Playoffs {sortKey === "playoff" && (sortDir === "desc" ? "▾" : "▴")}
          </button>
          <button
            type="button"
            className={`${s.headerBtn} ${sortKey === "division" ? s.active : ""}`}
            onClick={() => handleHeaderClick("division")}
          >
            Division {sortKey === "division" && (sortDir === "desc" ? "▾" : "▴")}
          </button>
          <button
            type="button"
            className={`${s.headerBtn} ${sortKey === "conference" ? s.active : ""}`}
            onClick={() => handleHeaderClick("conference")}
          >
            Conf. Champ {sortKey === "conference" && (sortDir === "desc" ? "▾" : "▴")}
          </button>
          <button
            type="button"
            className={`${s.headerBtn} ${sortKey === "superBowl" ? s.active : ""}`}
            onClick={() => handleHeaderClick("superBowl")}
          >
            Super Bowl {sortKey === "superBowl" && (sortDir === "desc" ? "▾" : "▴")}
          </button>
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