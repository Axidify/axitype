import { charsetValid } from "./keyBias";

export const PASTE_MIN_LENGTH = 12;
export const PASTE_MAX_LENGTH = 2000;

export interface PasteAnalysis {
  normalized: string;
  prompt: string;
  unknownChars: string[];
  removedCount: number;
  tooShort: boolean;
  truncated: boolean;
}

/** Collapse line breaks and repeated whitespace for typing prompts. */
export function normalizePasteInput(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\t/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

export function findUnknownChars(text: string, keys: string): string[] {
  const allowed = new Set(keys.split(""));
  const unknown = new Set<string>();
  for (const ch of text) {
    if (!allowed.has(ch)) unknown.add(ch);
  }
  return [...unknown].sort();
}

export function filterToCharset(text: string, keys: string): { filtered: string; removedCount: number } {
  const allowed = new Set(keys.split(""));
  let removedCount = 0;
  let filtered = "";
  for (const ch of text) {
    if (allowed.has(ch)) filtered += ch;
    else removedCount += 1;
  }
  return { filtered: normalizePasteInput(filtered), removedCount };
}

export function analyzePasteText(raw: string, keys: string): PasteAnalysis {
  const normalized = normalizePasteInput(raw);
  const unknownChars = findUnknownChars(normalized, keys);
  const { filtered, removedCount } = filterToCharset(normalized, keys);
  const truncated = filtered.length > PASTE_MAX_LENGTH;
  const prompt = truncated ? filtered.slice(0, PASTE_MAX_LENGTH).trimEnd() : filtered;
  return {
    normalized,
    prompt,
    unknownChars,
    removedCount,
    tooShort: prompt.length < PASTE_MIN_LENGTH,
    truncated,
  };
}

export function preparePastePrompt(raw: string, keys: string): { ok: true; prompt: string } | { ok: false; error: string } {
  const analysis = analyzePasteText(raw, keys);
  if (analysis.tooShort) {
    if (analysis.normalized.length < PASTE_MIN_LENGTH) {
      return { ok: false, error: `Need at least ${PASTE_MIN_LENGTH} characters after cleanup.` };
    }
    return {
      ok: false,
      error: `Too few unlocked keys in this text — only ${analysis.prompt.length} characters remain.`,
    };
  }
  if (!charsetValid(analysis.prompt, keys)) {
    return { ok: false, error: "Prompt still contains keys you have not unlocked." };
  }
  return { ok: true, prompt: analysis.prompt };
}

export function pastePracticeTitle(prompt: string): string {
  const preview = prompt.slice(0, 40).trimEnd();
  return preview.length < prompt.length ? `Paste · ${preview}…` : `Paste · ${preview}`;
}
