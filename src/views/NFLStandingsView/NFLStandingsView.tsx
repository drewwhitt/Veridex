import { useMemo } from "react";
import { buildNflStandings } from "../../data/nfl/nflLive";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import s from "./NFLStandingsView.module.css";

type Props = {
  stored: StoredNflResults;
};

export function NFLStandingsView({ stored }: Props) {
  const standings = useMemo(() => buildNflStandings(stored), [stored]);

  return (
    <div className={s.container}>
      {standings.map((division) => (
        <div key={`${division.conference}-${division.division}`} className={s.division}>
          <h2>{division.division} ({division.conference})</h2>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Team</th>
                <th>W</th>
                <th>L</th>
                <th>T</th>
                <th>PCT</th>
              </tr>
            </thead>
            <tbody>
              {division.rows.map((row) => (
                <tr key={row.code} className={s.row}>
                  <td className={s.teamName}>{row.name}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.ties}</td>
                  <td>{row.pct.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}