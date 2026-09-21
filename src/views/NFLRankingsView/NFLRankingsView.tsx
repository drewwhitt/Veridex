import { useMemo } from "react";
import { buildNflTeams } from "../../data/nfl/nflLive";
import { buildLiveElos } from "../../data/nfl/eloLive";
import { NFL_TEAM_BY_CODE } from "../../data/nfl/teams";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import s from "./NFLRankingsView.module.css";

type Props = {
  stored: StoredNflResults;
};

function ratingFromElo(elo: number): number {
  return Number(Math.max(55, Math.min(96, 55 + (elo - 1500) / 5)).toFixed(1));
}

export function NFLRankingsView({ stored }: Props) {
  const baselineTeams = useMemo(() => buildNflTeams(), []);
  const liveElos = useMemo(() => buildLiveElos(stored), [stored]);

  const teams = useMemo(() => {
    return baselineTeams.map((t) => ({
      ...t,
      elo: liveElos[t.code] ?? t.elo,
      rating: ratingFromElo(liveElos[t.code] ?? t.elo),
    })).sort((a, b) => b.elo - a.elo);
  }, [baselineTeams, liveElos]);
  const afc = teams.filter((t) => t.conference === "AFC");
  const nfc = teams.filter((t) => t.conference === "NFC");

  return (
    <>
      <section className={s.header}>
        <h1>Power Rankings</h1>
        <p>Preseason Elo, reverted toward the league mean after a full real 1999–2025 backtest. Updates once real 2026 results start coming in.</p>
      </section>

      <div className={s.conferences}>
        {[{ label: "AFC", list: afc }, { label: "NFC", list: nfc }].map((conf) => (
          <section className={s.conference} key={conf.label}>
            <h2>{conf.label}</h2>
            <ol className={s.list}>
              {conf.list.map((t, i) => (
                <li key={t.code}>
                  <span className={s.rank}>{i + 1}</span>
                  <span className={s.team}>{t.city} {t.name}</span>
                  <span className={s.division}>{conf.label} {t.division}</span>
                  <span className={s.rating}>{t.rating}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}