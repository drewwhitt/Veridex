import { useMemo } from "react";
import type { Headline, Team } from "../../data/worldCup";
import type { StoredResults } from "../../lib/types";
import s from "./Hero.module.css";

type Props = {
  teams: Team[];
  playedCount: number;
  /** Kept so existing callers still compile. The hero no longer reads it. */
  stored?: StoredResults;
  /** Top story from the live headline pool. */
  headline?: Headline;
};

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]);
}

export function Hero({ teams, playedCount, headline }: Props) {
  const favorite = [...teams].sort((a, b) => b.current - a.current)[0];

  // Pre-tournament rank by baseline title odds. Used only by the
  // completed-tournament fallback headline below.
  const baselineRank = useMemo(() => {
    const ranked = [...teams].sort((a, b) => b.baseline - a.baseline);
    return ranked.findIndex((t) => t.code === favorite.code) + 1;
  }, [teams, favorite.code]);

  let heroTitle: string;
  let heroSub: string;
  if (headline) {
    heroTitle = headline.title;
    heroSub = headline.summary;
  } else if (favorite.isChampion) {
    heroTitle = `${favorite.name} Wins the World Cup`;
    heroSub = baselineRank === 1
      ? `Veridex had ${favorite.name} at ${favorite.baseline.toFixed(1)}% to win it all before a ball was kicked — the model's preseason favorite came through.`
      : `Veridex had ${favorite.name} at ${favorite.baseline.toFixed(1)}% to win it all before a ball was kicked, the ${ordinal(baselineRank)} favorite in the field — not the pick, but well within reach.`;
  } else {
    heroTitle = `${favorite.name} Leads World Cup Forecast After Latest Results`;
    heroSub = `The Veridex model ran ${playedCount > 0 ? "10,000" : "pre-tournament"} simulations using every real result recorded so far and now rates ${favorite.name} the tournament's most likely champion.`;
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <section className={s.hero}>
      <div className={s.kicker}>{today}</div>
      <h1>{heroTitle}</h1>
      <p>{heroSub}</p>
      <div className={s.byline}>
        <span>VERIDEX Analytics Desk</span>
        <em />
        Live model
      </div>
    </section>
  );
}