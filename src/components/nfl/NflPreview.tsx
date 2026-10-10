import { useMemo } from "react";
import { NFL_SCHEDULE, fullTeamName, getNflWeekProgress } from "../../data/nfl/nflLive";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import type { TabId } from "../../data/worldCup";
import s from "./NflPreview.module.css";

type Props = {
  onNavigate: (tab: TabId) => void;
  stored: StoredNflResults;
};

export function NflPreview({ onNavigate, stored }: Props) {
  const latest = useMemo(() => {
    const progress = getNflWeekProgress(stored);
    const scored = progress.filter((p) => p.played > 0);
    if (scored.length === 0) return null;
    const current = scored[scored.length - 1];
    const games = NFL_SCHEDULE.filter(
      (g) => g.type === "REG" && g.week === current.week && stored[g.id],
    ).sort((a, b) => a.date.localeCompare(b.date));
    return { ...current, games };
  }, [stored]);

  return (
    <section className={s.card}>
      <div className={s.header}>
        <div className={s.kicker}>
          {latest
            ? `NFL · Week ${latest.week} · ${latest.played === latest.total ? "Final" : `${latest.played} of ${latest.total} scored`}`
            : "NFL · 2026 Season"}
        </div>
        <button type="button" className={s.link} onClick={() => onNavigate("nflForecasts")}>
          See full coverage →
        </button>
      </div>

      {latest ? (
        <>
          <h3>Week {latest.week} Results</h3>
          <ul className={s.rankings}>
            {latest.games.map((g) => {
              const r = stored[g.id];
              return (
                <li key={g.id}>
                  <span>{fullTeamName(g.away)}</span>
                  <span>{r.awayScore}</span>
                  <span>–</span>
                  <span>{r.homeScore}</span>
                  <span>{fullTeamName(g.home)}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <h3>2026 Season Kicks Off September 9</h3>
          <div className={s.stat}>No scores entered yet.</div>
        </>
      )}
    </section>
  );
}