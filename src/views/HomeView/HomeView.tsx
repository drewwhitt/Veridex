import type { ReactNode } from "react";
import { type Headline, type MorningForecast as MorningForecastData, type Team, type TabId } from "../../data/worldCup";
import { TEAM_BY_CODE } from "../../lib/teams";
import type { StoredResults } from "../../lib/types";
import type { StoredNflResults } from "../../data/nfl/nflLive";
import { NflPreview } from "../../components/nfl/NflPreview";
import { Carousel } from "../../components/carousel/Carousel";
import { Hero } from "./Hero";
import { HeadlineCard } from "./HeadlineCard";
import { MorningForecast } from "./MorningForecast";
import { QuickStrip } from "./QuickStrip";
import { FavoritesStrip } from "./FavoritesStrip";
import { HighestConfidence } from "./HighestConfidence";
import { ConfidenceAlert } from "./ConfidenceAlert";
import s from "./HomeView.module.css";

type Props = {
  teams: Team[];
  morning: MorningForecastData;
  /** YYYY-MM-DD the morning briefing is actually from — may be a prior
   *  day if nothing's been published today yet. */
  morningDate: string;
  headlines: Headline[];
  playedCount: number;
  stored: StoredResults;
  nflStored: StoredNflResults;
  onNavigate?: (tab: TabId) => void;
};

const TEAM_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_BY_CODE).map(([code, t]) => [code, t.name]),
);

/** How many "Latest from the model" cards show at once. */
const LATEST_PER_SLIDE = 4;

export function HomeView({
  teams,
  morning,
  morningDate,
  headlines,
  playedCount,
  stored,
  nflStored,
  onNavigate,
}: Props) {
  // Confidence Alert takes the top of the headline rotation (after the
  // hero). Latest from the model takes whatever is left and rotates
  // through it four at a time.
  const ALERT_SLIDE_COUNT = 3;
  const [heroHeadline, ...remainingHeadlines] = headlines;
  const alertHeadlines = remainingHeadlines.slice(0, ALERT_SLIDE_COUNT);
  const restHeadlines = remainingHeadlines.slice(ALERT_SLIDE_COUNT);
  const isComplete = teams.some((t) => t.isChampion);

  const latestSlides: ReactNode[] = [];
  for (let i = 0; i < restHeadlines.length; i += LATEST_PER_SLIDE) {
    const group = restHeadlines.slice(i, i + LATEST_PER_SLIDE);
    latestSlides.push(
      <section className={s.headlineGrid} key={`latest-${i}`}>
        {group.map((headline) => (
          <HeadlineCard headline={headline} key={headline.title} />
        ))}
      </section>,
    );
  }

  return (
    <>
      <Hero teams={teams} playedCount={playedCount} stored={stored} headline={heroHeadline} />

      {onNavigate && <NflPreview onNavigate={onNavigate} stored={nflStored} />}

      {!isComplete && (
        <QuickStrip teams={teams} onNavigate={onNavigate ? () => onNavigate("rankings") : undefined} />
      )}
      <FavoritesStrip teams={teams} teamNames={TEAM_NAMES} />

      <HighestConfidence stored={stored} />

      <MorningForecast forecast={morning} date={morningDate} />

      <ConfidenceAlert headlines={alertHeadlines} />

      {latestSlides.length > 0 && (
        <>
          <section className={s.latestHeader}>
            <h2>Latest from the model</h2>
            <span>Updated continuously</span>
          </section>
          <Carousel items={latestSlides} intervalMs={8000} />
        </>
      )}
    </>
  );
}