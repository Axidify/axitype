import { assembleUnits, charsetValid, weakestKey } from "./keyBias";
import type { KeyStatMap } from "../lib/storage";

const LEVEL_CHUNKS: Record<number, string[]> = {
  1: [
    "aaaa",
    "ssss",
    "llll",
    ";;;;",
    "asas",
    "slsl",
    "l;l;",
    "alal",
    "s;s;",
    "asl;",
    "alas",
    "sals",
  ],
  2: [
    "asdf",
    "fads",
    "sadf",
    "sad",
    "fad",
    "dad",
    "asdfasdf",
    "fadsfads",
    "dadsad",
    "adfadf",
  ],
  3: [
    "jkl;",
    "lkj;",
    ";lkj",
    "jl;j",
    "jkjk",
    "l;l;",
    "jkl;jkl;",
    "lkj;lkj",
    ";lkj;lkj",
  ],
  4: [
    "a sad lad",
    "fall falls",
    "a lad asks",
    "salad falls",
    "sad lad falls",
    "dad asks lad",
  ],
};

function weightedChunks(chunks: string[], stats?: KeyStatMap): string[] {
  const focus = weakestKey(
    [...new Set(chunks.join("").replace(/\s/g, ""))],
    stats,
  );
  return chunks.flatMap((chunk) => (focus && chunk.includes(focus) ? [chunk, chunk] : [chunk]));
}

export function chunksForLevel(levelId: number): string[] {
  return LEVEL_CHUNKS[levelId] ?? LEVEL_CHUNKS[1];
}

export function generatePatternPrompt(
  levelId: number,
  keys: string,
  targetLength: number,
  stats?: KeyStatMap,
): string {
  const chunks = weightedChunks(chunksForLevel(levelId), stats).filter((c) =>
    charsetValid(c, keys),
  );
  if (chunks.length === 0) return "asl;".slice(0, targetLength);
  return assembleUnits(chunks, targetLength, " ", keys);
}

export function validateLevelChunks(): void {
  for (const [levelId, chunks] of Object.entries(LEVEL_CHUNKS)) {
    const keys = levelId === "1" ? "asl;" : levelId === "2" ? "asdf" : levelId === "3" ? "jkl;" : "asdfjkl; ";
    for (const chunk of chunks) {
      if (!charsetValid(chunk, keys)) {
        throw new Error(`Level ${levelId} chunk invalid for charset: ${chunk}`);
      }
    }
  }
}
