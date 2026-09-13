import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { AdminResultsPanel } from "./components/admin/AdminResultsPanel";
import { AdminNflResultsPanel } from "./components/admin/AdminNflResultsPanel";
import { AdminFantasyRankingsPanel } from "./components/admin/AdminFantasyRankingsPanel";
import { AppShell } from "./components/shell/AppShell";
import { ErrorBoundary } from "./components/shell/ErrorBoundary";
import type { Edition, MorningForecast as MorningForecastData, TabId } from "./data/worldCup";
import seedResults from "./data/results.json";
import {
  buildLiveBreakingText,
  buildLiveHeadlines,
  buildLiveMorningForecast,
  buildLiveTeams,
} from "./data/veridexLive";
import { loadOfficialResults, loadNflResults } from "./lib/supabase";
import { loadLatestDailyBriefing } from "./lib/dailyBriefing";
import type { StoredResults } from "./lib/types";
import type { StoredNflResults } from "./data/nfl/nflLive";
import { HomeView } from "./views/HomeView/HomeView";

const BracketView = lazy(() => import("./views/BracketView/BracketView").then((m) => ({ default: m.BracketView })));
const ForecastsView = lazy(() => import("./views/ForecastsView/ForecastsView").then((m) => ({ default: m.ForecastsView })));
const RankingsView = lazy(() => import("./views/RankingsView/RankingsView").then((m) => ({ default: m.RankingsView })));
const AnalyticsView = lazy(() => import("./views/AnalyticsView/AnalyticsView").then((m) => ({ default: m.AnalyticsView })));
const StandingsView = lazy(() => import("./views/StandingsView/StandingsView").then((m) => ({ default: m.StandingsView })));
const NFLScheduleView = lazy(() => import("./views/NFLScheduleView/NFLScheduleView").then((m) => ({ default: m.NFLScheduleView })));
const NFLRankingsView = lazy(() => import("./views/NFLRankingsView/NFLRankingsView").then((m) => ({ default: m.NFLRankingsView })));
const NFLStandingsView = lazy(() => import("./views/NFLStandingsView/NFLStandingsView").then((m) => ({ default: m.NFLStandingsView })));
const NFLForecastsView = lazy(() => import("./views/NFLForecastsView/NFLForecastsView").then((m) => ({ default: m.NFLForecastsView })));
const FantasyView = lazy(() => import("./views/FantasyView/FantasyView").then((m) => ({ default: m.FantasyView })));

function TabLoading() {
  return <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-3)" }}>Loading…</div>;
}

const edition: Edition = "wire";
const STORAGE_KEY = "worldcup-predictor-results";
const NFL_STORAGE_KEY = "nfl-results";
const VALID_TABS: TabId[] = ["home", "forecasts", "rankings", "analytics", "standings", "bracket", "nflSchedule", "nflRankings", "nflStandings", "nflForecasts", "nflFantasy"];

function getTabFromHash(): TabId {
  const hash = window.location.hash.slice(1) as TabId;
  return VALID_TABS.includes(hash) ? hash : "home";
}

function normalizeStoredResults(raw: unknown): StoredResults {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<StoredResults>;
  return {
    matches: obj.matches && typeof obj.matches === "object" ? obj.matches : {},
    knockoutMatches: obj.knockoutMatches && typeof obj.knockoutMatches === "object" ? obj.knockoutMatches : {},
  };
}

function normalizeStoredNflResults(raw: unknown): StoredNflResults {
  return (raw && typeof raw === "object" ? raw : {}) as StoredNflResults;
}

function loadLocalResults(): StoredResults {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeStoredResults(JSON.parse(raw));
  } catch { /* use seed */ }
  return normalizeStoredResults(seedResults);
}

function loadLocalNflResults(): StoredNflResults {
  try {
    const raw = localStorage.getItem(NFL_STORAGE_KEY);
    if (raw) return normalizeStoredNflResults(JSON.parse(raw));
  } catch { /* use empty */ }
  return {};
}

export default function App() {
  const [stored, setStored] = useState<StoredResults>(loadLocalResults);
  const [storedNfl, setStoredNfl] = useState<StoredNflResults>(loadLocalNflResults);
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromHash);
  const [dailyBriefing, setDailyBriefing] = useState<{ date: string; payload: MorningForecastData } | null>(null);

  function changeTab(tab: TabId) {
    if (tab === activeTab) return;
    window.history.pushState({ tab }, "", `#${tab}`);
    setActiveTab(tab);
  }

  useEffect(() => {
    function handlePopState() {
      setActiveTab(getTabFromHash());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState({ tab: "home" }, "", "#home");
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadOfficialResults()
      .then((results) => {
        if (!active) return;
        const normalized = normalizeStoredResults(results);
        setStored(normalized);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      })
      .catch((err) => console.error("Failed to load official results", err));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    loadNflResults()
      .then((results) => {
        if (!active) return;
        const normalized = normalizeStoredNflResults(results);
        setStoredNfl(normalized);
        localStorage.setItem(NFL_STORAGE_KEY, JSON.stringify(normalized));
      })
      .catch((err) => console.error("Failed to load NFL results", err));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    loadLatestDailyBriefing<MorningForecastData>("world_cup")
      .then((result) => {
        if (active && result) setDailyBriefing(result);
      })
      .catch((err) => console.error("Failed to load daily briefing", err));
    return () => { active = false; };
  }, []);

  const liveTeams     = useMemo(() => buildLiveTeams(stored), [stored]);
  const liveMorning   = useMemo(() => buildLiveMorningForecast(liveTeams, stored), [liveTeams, stored]);
  const morning     = dailyBriefing?.payload ?? liveMorning;
  const morningDate = dailyBriefing?.date ?? new Date().toISOString().slice(0, 10);
  const liveHeadlines = useMemo(() => buildLiveHeadlines(liveTeams, stored), [liveTeams, stored]);
  const liveBreaking  = useMemo(() => buildLiveBreakingText(liveTeams, stored), [liveTeams, stored]);
  const playedCount   = Object.keys(stored.matches).length;
  const isAdmin       = new URLSearchParams(window.location.search).get("admin") === "true";

  function renderContent() {
    switch (activeTab) {
      case "forecasts":
        return <ForecastsView stored={stored} teams={liveTeams} />;
      case "bracket":
        return <BracketView stored={stored} />;
      case "standings":
        return <StandingsView stored={stored} />;
      case "rankings":
        return <RankingsView stored={stored} />;
      case "analytics":
        return <AnalyticsView stored={stored} teams={liveTeams} />;
      case "nflSchedule":
        return <NFLScheduleView stored={storedNfl} />;
      case "nflRankings":
        return <NFLRankingsView stored={storedNfl} />;
      case "nflStandings":
        return <NFLStandingsView stored={storedNfl} />;
      case "nflForecasts":
        return <NFLForecastsView stored={storedNfl} />;
      case "nflFantasy":
        return <FantasyView />;
      case "home":
      default:
        return (
          <HomeView
            teams={liveTeams}
            morning={morning}
            morningDate={morningDate}
            headlines={liveHeadlines}
            playedCount={playedCount}
            stored={stored}
            onNavigate={changeTab}
          />
        );
    }
  }

  return (
    <>
      <AppShell
        activeTab={activeTab}
        edition={edition}
        breakingText={liveBreaking}
        onNavigate={changeTab}
      >
        <ErrorBoundary key={activeTab}>
          <Suspense fallback={<TabLoading />}>{renderContent()}</Suspense>
        </ErrorBoundary>
      </AppShell>
      {isAdmin && (
        <>
          <AdminResultsPanel stored={stored} onChange={setStored} onBriefingSaved={setDailyBriefing} />
          <AdminNflResultsPanel stored={storedNfl} onChange={setStoredNfl} />
          <AdminFantasyRankingsPanel />
        </>
      )}
    </>
  );
}