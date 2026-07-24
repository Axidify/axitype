/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as promptLayout from "./promptLayout";
import { PromptLine } from "./PromptLine";

function mockFontsReady() {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: {
      ready: Promise.resolve(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
}

function mockCharPositions(length: number) {
  return Array.from({ length }, (_, i) => ({ left: i * 10, top: 0 }));
}

describe("PromptLine", () => {
  beforeEach(() => {
    mockFontsReady();
    vi.spyOn(promptLayout, "measurePromptCharPositions").mockImplementation((_el, length) =>
      mockCharPositions(length),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes the full prompt on the wrapper aria-label", () => {
    render(<PromptLine prompt="as df" index={0} lastMiss={false} />);
    expect(screen.getByLabelText("as df")).toBeInTheDocument();
  });

  it("paints positioned characters after layout measurement", async () => {
    const { container } = render(<PromptLine prompt="ab" index={0} lastMiss={false} />);

    await waitFor(() => {
      expect(container.querySelectorAll('[class*="char"]')).toHaveLength(2);
    });
  });

  it("marks completed characters as done and highlights the caret", async () => {
    const { container } = render(<PromptLine prompt="abc" index={2} lastMiss={false} />);

    await waitFor(() => {
      const chars = container.querySelectorAll('[class*="char"]');
      expect(chars).toHaveLength(3);
      expect(chars[0]?.className).toMatch(/done/);
      expect(chars[1]?.className).toMatch(/done/);
      expect(chars[2]?.className).toMatch(/caret/);
    });
  });

  it("flags a miss on the active character", async () => {
    const { container } = render(<PromptLine prompt="abc" index={1} lastMiss={true} />);

    await waitFor(() => {
      const caret = container.querySelector('[class*="caret"]');
      expect(caret?.className).toMatch(/miss/);
    });
  });

  it("renders spaces as non-breaking spaces in the paint layer", async () => {
    const { container } = render(<PromptLine prompt="a b" index={0} lastMiss={false} />);

    await waitFor(() => {
      const chars = container.querySelectorAll('[class*="char"]');
      expect(chars[1]?.textContent).toBe("\u00a0");
    });
  });
});
