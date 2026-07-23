export interface CharPosition {
  left: number;
  top: number;
}

/** Measure each character's offset inside a single-line layout element. */
export function measurePromptCharPositions(
  layoutEl: HTMLElement,
  length: number,
): CharPosition[] {
  if (length === 0) return [];

  const textNode = layoutEl.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return [];

  const text = textNode.textContent ?? "";
  const count = Math.min(length, text.length);
  if (count === 0) return [];

  const containerRect = layoutEl.getBoundingClientRect();
  const positions: CharPosition[] = [];

  for (let i = 0; i < count; i++) {
    const range = document.createRange();
    range.setStart(textNode, i);
    range.setEnd(textNode, i + 1);
    const rect = range.getBoundingClientRect();
    positions.push({
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
    });
  }

  return positions;
}

export function displayChar(ch: string): string {
  return ch === " " ? "\u00a0" : ch;
}
