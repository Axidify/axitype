/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FocusRunState } from "../game/focus";
import { FocusGate } from "./FocusGate";

const baseRun: FocusRunState = {
  plan: {
    kind: "oneFinger",
    title: "One Finger",
    fingerLabel: "Ring",
    zone: "finger",
    reason: "Ring finger misses climbed.",
    focusKeys: ["a", "s", "d", "f"],
    weakKey: "s",
    lockFinger: "RI",
  },
  phase: "speed",
  round: 1,
  speedTier: 2,
  targetWpm: 18,
  accuracyRounds: 1,
  speedRounds: 2,
  attempts: 3,
};

function renderGate(overrides: Partial<Parameters<typeof FocusGate>[0]> = {}) {
  return render(
    <FocusGate
      run={baseRun}
      gate="speedTier"
      track="learn"
      unlockedLevel={12}
      recentWpm={[20, 22]}
      lastAccuracy={99}
      lastWpm={24}
      lastFocusMisses={0}
      onProgress={vi.fn()}
      onPracticeAgain={vi.fn()}
      onExit={vi.fn()}
      {...overrides}
    />,
  );
}

describe("FocusGate", () => {
  it("shows tier progress after a speed round", () => {
    renderGate();
    expect(screen.getByText("Speed tier 2 of 3 cleared.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next tier/i })).toBeInTheDocument();
  });

  it("shows finish copy after the final speed tier", () => {
    renderGate({ run: { ...baseRun, speedTier: 3 } });
    expect(screen.getByText("All 3 speed tiers cleared.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finish session/i })).toBeInTheDocument();
  });

  it("routes Space to progress and Escape to exit", () => {
    const onProgress = vi.fn();
    const onExit = vi.fn();
    renderGate({ onProgress, onExit });

    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
