import { useEffect, useMemo, useState, useRef } from "react";
import { saveOfficialResult } from "../../lib/supabase";
import { NFL_SCHEDULE, fullTeamName, getNextNflWeek } from "../../data/nfl/nflLive";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import s from "./AdminNflResultsPanel.module.css";

type Props = {
  stored: StoredNflResults;
  onChange: (next: StoredNflResults) => void;
};

export function AdminNflResultsPanel({ stored, onChange }: Props) {
  // Start on the next week to enter, based on saved results.
  const [selectedWeek, setSelectedWeek] = useState<number>(() => getNextNflWeek(stored));
  // Once the admin picks a week by hand, stop auto-advancing so a save
  // doesn't jump them away from a week they're correcting.
  const weekTouched = useRef(false);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const homeInputRef = useRef<HTMLInputElement>(null);
  const awayInputRef = useRef<HTMLInputElement>(null);

  // Follow saved results (e.g. after Supabase finishes loading) until the admin picks a week.
  useEffect(() => {
    if (!weekTouched.current) setSelectedWeek(getNextNflWeek(stored));
  }, [stored]);

  const weeks = useMemo(() => {
    const weekSet = new Set<number>();
    for (const game of NFL_SCHEDULE) {
      if (game.type === "REG") weekSet.add(game.week);
    }
    return Array.from(weekSet).sort((a, b) => a - b);
  }, []);

  const gamesInWeek = useMemo(() => {
    return NFL_SCHEDULE.filter(
      (game) => game.type === "REG" && game.week === selectedWeek
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedWeek]);

  // When the week changes, select its first game and load its saved scores.
  useEffect(() => {
    const first = gamesInWeek[0];
    if (first) selectGame(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  function selectGame(gameId: string) {
    const game = NFL_SCHEDULE.find((g) => g.id === gameId);
    if (!game) return;

    setSelectedGameId(gameId);
    const saved = stored[gameId];
    setHomeScore(saved?.homeScore.toString() ?? "0");
    setAwayScore(saved?.awayScore.toString() ?? "0");
    setStatus("idle");
  }

  function focusAwayInput() {
    awayInputRef.current?.focus();
  }

  function focusHomeInput() {
    homeInputRef.current?.focus();
  }

  async function saveResult() {
    const home = Number(homeScore);
    const away = Number(awayScore);
    if (Number.isNaN(home) || Number.isNaN(away) || home < 0 || away < 0) return;

    const game = NFL_SCHEDULE.find((g) => g.id === selectedGameId);
    if (!game) return;

    const next: StoredNflResults = {
      ...stored,
      [selectedGameId]: { homeScore: home, awayScore: away },
    };
    onChange(next);
    localStorage.setItem("nfl-results", JSON.stringify(next));
    setStatus("saving");

    try {
      const dbMatchId = `nfl-${selectedGameId}`;
      console.log(`[NFL Admin] Saving ${dbMatchId}: ${home} - ${away}`);
      await saveOfficialResult(dbMatchId, home, away);
      console.log(`[NFL Admin] ✓ Successfully saved ${dbMatchId}`);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[NFL Admin] ✗ Failed to save ${selectedGameId}:`, errMsg);
      alert(`Failed to save: ${errMsg}`);
      setStatus("error");
    }
  }

  const currentGame = gamesInWeek.find((g) => g.id === selectedGameId);
  const isPlayoffWeek = gamesInWeek.length === 0;

  return (
    <div className={s.panel}>
      <h2>NFL Results</h2>

      <div className={s.section}>
        <label>Week</label>
        <select
          value={selectedWeek}
          onChange={(e) => {
            weekTouched.current = true;
            setSelectedWeek(Number(e.target.value));
          }}
        >
          {weeks.map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
          <option value="playoffs">Playoffs</option>
        </select>
      </div>

      {isPlayoffWeek ? (
        <div className={s.empty}>No regular season games for this week.</div>
      ) : (
        <>
          <div className={s.section}>
            <label>Game</label>
            <select value={selectedGameId} onChange={(e) => selectGame(e.target.value)}>
              {gamesInWeek.map((game) => {
                const saved = stored[game.id];
                const played = saved ? "✓" : " ";
                return (
                  <option key={game.id} value={game.id}>
                    [{played}] {fullTeamName(game.away)} @ {fullTeamName(game.home)}{" "}
                    ({game.date})
                  </option>
                );
              })}
            </select>
          </div>

          {currentGame && (
            <>
              <div className={s.matchInfo}>
                <div className={s.team}>
                  <strong>{fullTeamName(currentGame.away)}</strong> (away)
                </div>
                <div className={s.team}>
                  <strong>{fullTeamName(currentGame.home)}</strong> (home)
                </div>
              </div>

              <div className={s.scores}>
                <div className={s.scoreInput}>
                  <label htmlFor="away-score">Away Score</label>
                  <input
                    ref={awayInputRef}
                    id="away-score"
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    onFocus={focusAwayInput}
                  />
                </div>
                <div className={s.scoreInput}>
                  <label htmlFor="home-score">Home Score</label>
                  <input
                    ref={homeInputRef}
                    id="home-score"
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    onFocus={focusHomeInput}
                  />
                </div>
              </div>

              <button
                className={s.saveButton}
                onClick={saveResult}
                disabled={status === "saving"}
              >
                {status === "saving" && "Saving..."}
                {status === "saved" && "Saved!"}
                {status === "error" && "Error — try again"}
                {status === "idle" && "Save Result"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}