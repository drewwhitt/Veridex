import { useMemo } from "react";
import { fullTeamName } from "../../data/nfl/nflLive";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import { buildNflWeekHighlights } from "../../data/nfl/nflHome";
import type { TabId } from "../../data/worldCup";
import s from "./NflPreview.module.css";

type Props = {
  onNavigate: (tab: TabId) => void;
  stored: StoredNflResults;
};

export function NflPreview({ onNavigate, stored }: Props) {
  const week = useMemo(() => buildNflWeekHighlights(stored), [stored]);

  return (
    <section className={s.card}>
      <div className={s.header}>
        <div className={s.kicker}>
          {week
            ? `NFL · Week ${week.week} · ${week.played === week.total ? "Final" : `${week.played} of ${week.total} scored`}`
            : "NFL · 2026 Season"}
        </div>
        <button type="button" className={s.link} onClick={() => onNavigate("nflForecasts")}>
          See full coverage →
        </button>
      </div>

      {week && week.highlights.length > 0 ? (
        <>
          <h3>Week {week.week} Highlights</h3>
          <ul className={s.list}>
            {week.highlights.map(({ game, reason }) => (
              <li key={game.id} className={s.row}>
                <span className={s.tag}>{reason}</span>
                <span className={s.matchup}>
                  {fullTeamName(game.away)} <strong>{game.awayScore}</strong>
                  <span className={s.dash}>–</span>
                  <strong>{game.homeScore}</strong> {fullTeamName(game.home)}
                </span>
              </li>
            ))}
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