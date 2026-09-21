import { useMemo, useState } from "react";
import { buildNflStandings, NFL_SCHEDULE } from "../../data/nfl/nflLive";
import { NFL_TEAM_BY_CODE } from "../../data/nfl/teams";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import s from "./NFLStandingsView.module.css";

type Props = {
  stored: StoredNflResults;
};

export function NFLStandingsView({ stored }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const divisions = useMemo(() => buildNflStandings(stored), [stored]);

  const teamStats = useMemo(() => {
    if (!selectedTeam) return null;
    const team = NFL_TEAM_BY_CODE[selectedTeam];
    if (!team) return null;

    let pointsFor = 0;
    let pointsAgainst = 0;
    let divisionWins = 0;
    let divisionLosses = 0;
    let conferenceWins = 0;
    let conferenceLosses = 0;
    let homeWins = 0;
    let homeLosses = 0;
    let awayWins = 0;
    let awayLosses = 0;

    for (const game of NFL_SCHEDULE) {
      if (game.type !== "REG") continue;
      const result = stored[game.id];
      if (!result) continue;

      const isHome = game.home === selectedTeam;
      const isAway = game.away === selectedTeam;
      if (!isHome && !isAway) continue;

      const pf = isHome ? result.homeScore : result.awayScore;
      const pa = isHome ? result.awayScore : result.homeScore;
      pointsFor += pf;
      pointsAgainst += pa;

      const didWin = pf > pa;
      if (game.div) {
        if (didWin) divisionWins++;
        else divisionLosses++;
      }
      if (didWin) conferenceWins++;
      else conferenceLosses++;

      if (isHome) {
        if (didWin) homeWins++;
        else homeLosses++;
      } else {
        if (didWin) awayWins++;
        else awayLosses++;
      }
    }

    return {
      pointsFor,
      pointsAgainst,
      divisionRecord: `${divisionWins}-${divisionLosses}`,
      conferenceRecord: `${conferenceWins}-${conferenceLosses}`,
      homeRecord: `${homeWins}-${homeLosses}`,
      awayRecord: `${awayWins}-${awayLosses}`,
    };
  }, [selectedTeam, stored]);

  return (
    <>
      <section className={s.header}>
        <h1>2026 Standings</h1>
        <p>
          Scores are entered manually from the admin panel. Records update by division as real scores come in.
        </p>
      </section>

      <div className={s.groupsGrid}>
        {divisions.map((div) => (
          <div className={s.groupCard} key={`${div.conference}-${div.division}`}>
            <div className={s.groupCardHeader}>{div.conference} {div.division}</div>
            <div className={s.groupTable}>
              <div className={s.groupTableHead}>
                <span className={s.groupTeamCol}>Team</span>
                <span>W</span><span>L</span><span>T</span><span>PCT</span>
              </div>
              {div.rows.map((row) => (
                <div key={row.code}>
                  <div
                    className={`${s.groupRow} ${selectedTeam === row.code ? s.selected : ""}`}
                    onClick={() => setSelectedTeam(selectedTeam === row.code ? null : row.code)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedTeam(selectedTeam === row.code ? null : row.code);
                      }
                    }}
                  >
                    <span className={s.groupTeamCol}>
                      <span className={s.groupTeamName}>{row.code}</span>
                    </span>
                    <span>{row.wins}</span>
                    <span>{row.losses}</span>
                    <span>{row.ties}</span>
                    <span>{row.pct.toFixed(3).replace(/^0/, "")}</span>
                  </div>
                  {selectedTeam === row.code && teamStats && (
                    <div className={s.detailDrawer}>
                      <div className={s.statGrid}>
                        <div className={s.stat}>
                          <span className={s.label}>PF</span>
                          <span className={s.value}>{teamStats.pointsFor}</span>
                        </div>
                        <div className={s.stat}>
                          <span className={s.label}>PA</span>
                          <span className={s.value}>{teamStats.pointsAgainst}</span>
                        </div>
                        <div className={s.stat}>
                          <span className={s.label}>Div</span>
                          <span className={s.value}>{teamStats.divisionRecord}</span>
                        </div>
                        <div className={s.stat}>
                          <span className={s.label}>Conf</span>
                          <span className={s.value}>{teamStats.conferenceRecord}</span>
                        </div>
                        <div className={s.stat}>
                          <span className={s.label}>Home</span>
                          <span className={s.value}>{teamStats.homeRecord}</span>
                        </div>
                        <div className={s.stat}>
                          <span className={s.label}>Away</span>
                          <span className={s.value}>{teamStats.awayRecord}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}