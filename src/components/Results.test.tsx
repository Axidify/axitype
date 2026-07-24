/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { buildMissionMilestone } from "../game/milestones";
import { baseSnapshot } from "../test/fixtures";
import { Results } from "./Results";

vi.mock("./charts/LiveWpmChart", () => ({
  LiveWpmChart: () => <div data-testid="wpm-chart" />,
}));

const noop = () => {};

function renderResults(overrides: Partial<ComponentProps<typeof Results>> = {}) {
  return render(
    <Results
      title="Home anchors"
      snapshot={baseSnapshot()}
      levelId={1}
      track="learn"
      stars={3}
      unlockedNext={false}
      nextLevelId={null}
      unlockedLevel={1}
      keyEvents={[]}
      onRetry={noop}
      onNext={noop}
      onHub={noop}
      {...overrides}
    />,
  );
}

describe("Results", () => {
  it("shows mission stars and three-star kicker on a strong run", () => {
    renderResults({
      missionSummary: buildMissionMilestone({
        priorStars: 2,
        newStars: 3,
        priorBestScore: 100,
        runScore: 120,
        completed: true,
      }),
    });

    expect(screen.getByRole("heading", { name: "Home anchors" })).toBeInTheDocument();
    expect(screen.getByText("Three stars")).toBeInTheDocument();
    expect(screen.getByText("New mission best")).toBeInTheDocument();
  });

  it("uses focus session title and rehab kicker", () => {
    renderResults({
      title: "Focus",
      levelId: "focus",
      focusSummary: {
        rounds: 2,
        accuracyRounds: 1,
        speedRounds: 1,
        reason: "Ring finger misses climbed in recent rounds.",
        focusTitle: "One Finger",
        fingerLabel: "Ring",
        zone: "asdf",
        totalAttempts: 2,
        lastAccuracy: 98,
        lastWpm: 24,
        targetWpm: 20,
        lastFocusMisses: 0,
      },
    });

    expect(screen.getByRole("heading", { name: "Focus · One Finger" })).toBeInTheDocument();
    expect(screen.getByText("Rehab complete")).toBeInTheDocument();
    expect(screen.getByText(/Ring finger misses climbed/)).toBeInTheDocument();
  });

  it("celebrates a new daily best", () => {
    renderResults({
      title: "Daily",
      levelId: "daily",
      dailySummary: {
        date: "2026-07-24",
        wpm: 44,
        accuracy: 99,
        score: 880,
        completed: true,
        isNewBest: true,
        previousBest: { date: "2026-07-24", wpm: 40, accuracy: 97, score: 800, at: 0, attempts: 1 },
      },
    });

    expect(screen.getByText("New daily best")).toBeInTheDocument();
    expect(screen.getByText(/Beat today's best — was 40 WPM/)).toBeInTheDocument();
  });

  it("surfaces gauntlet wave summary and retry-focused coaching", () => {
    renderResults({
      title: "Gauntlet",
      levelId: "gauntlet",
      snapshot: baseSnapshot({ accuracy: 88, finished: true }),
      gauntletSummary: {
        wavesCleared: 1,
        totalScore: 420,
        failedWave: 2,
        newBest: false,
      },
      gauntletBest: { wavesCleared: 4, totalScore: 1200, at: 0 },
    });

    expect(screen.getByText("Gauntlet over")).toBeInTheDocument();
    expect(screen.getByText(/waves cleared/)).toBeInTheDocument();
    expect(screen.getByText(/below the 94% accuracy bar for wave 2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run again/i })).toBeInTheDocument();
  });

  it("labels demo runs without saving progress", () => {
    renderResults({ demoMode: true });
    expect(screen.getByText("Demo run — progress not saved")).toBeInTheDocument();
  });

  it("routes Escape to hub and Space to next mission when unlocked", () => {
    const onHub = vi.fn();
    const onNext = vi.fn();

    renderResults({
      unlockedNext: true,
      nextLevelId: 2,
      onHub,
      onNext,
    });

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: " " });

    expect(onHub).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledWith(2);
  });
});
