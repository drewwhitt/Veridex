import { useMemo } from "react";
import { buildNflMatchCenter } from "../../data/nfl/nflLive";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import s from "./NFLScheduleView.module.css";

type Props = {
  stored: StoredNflResults;
};

export function NFLScheduleView({ stored }: Props) {
  const entries = useMemo(() => buildNflMatchCenter(stored), [stored]);

  const byPeriod = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const list = map.get(entry.periodId) ?? [];
      list.push(entry);
      map.set(entry.periodId, list);
    }
    return map;
  }, [entries]);

  const periods = Array.from(byPeriod.keys()).sort();

  return (
    <div className={s.container}>
      {periods.map((periodId) => {
        const games = byPeriod.get(periodId) ?? [];
        return (
          <div key={periodId} className={s.period}>
            <h2>{periodId}</h2>
            <div className={s.games}>
              {games.map((game) => (
                <div key={game.id} className={s.game}>
                  <div className={s.matchup}>
                    <div className={s.team}>
                      <span className={s.name}>{game.awayName}</span>
                      {game.homeScore !== undefined && (
                        <span className={s.score}>{game.homeScore}</span>
                      )}
                    </div>
                    <div className={s.vs}>@</div>
                    <div className={s.team}>
                      <span className={s.name}>{game.homeName}</span>
                      {game.awayScore !== undefined && (
                        <span className={s.score}>{game.awayScore}</span>
                      )}
                    </div>
                  </div>
                  {game.date && (
                    <div className={s.date}>{game.date}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}