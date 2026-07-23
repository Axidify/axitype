/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { displayChar, measurePromptCharPositions } from "./promptLayout";

describe("displayChar", () => {
  it("renders spaces as non-breaking space", () => {
    expect(displayChar(" ")).toBe("\u00a0");
    expect(displayChar("a")).toBe("a");
  });
});

describe("measurePromptCharPositions", () => {
  it("returns empty positions for empty prompt", () => {
    const el = document.createElement("p");
    expect(measurePromptCharPositions(el, 0)).toEqual([]);
  });

  it("measures each character relative to the layout element", () => {
    const el = document.createElement("p");
    el.textContent = "ab";
    document.body.appendChild(el);

    const rects = [
      { left: 10, top: 20, width: 8, height: 16 },
      { left: 18, top: 20, width: 8, height: 16 },
    ];

    let call = 0;
    vi.spyOn(document, "createRange").mockImplementation(() => {
      const rect = rects[call] ?? rects[rects.length - 1];
      call += 1;
      return {
        setStart: vi.fn(),
        setEnd: vi.fn(),
        getBoundingClientRect: () => rect,
      } as unknown as Range;
    });

    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 20,
      right: 100,
      bottom: 20,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const positions = measurePromptCharPositions(el, 2);
    expect(positions).toHaveLength(2);
    expect(positions[0]).toEqual({ left: 10, top: 20 });
    expect(positions[1]).toEqual({ left: 18, top: 20 });

    el.remove();
    vi.restoreAllMocks();
  });
});
