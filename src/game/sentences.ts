import { assembleUnits, charsetValid, scoreTextWeakness, weakestKey } from "./keyBias";
import type { KeyStatMap } from "../lib/storage";

const SENTENCE_BANK: string[] = [
  "the quick fox runs",
  "a calm lake sits still",
  "we type with all ten fingers",
  "slow and steady wins the race",
  "practice makes better habits",
  "look ahead not down",
  "home row is your anchor",
  "left hand stays on asdf",
  "right hand stays on jkl",
  "space with your thumb",
  "reach then return home",
  "keep wrists level and light",
  "accuracy beats raw speed",
  "breathe and reset after misses",
  "short bursts build muscle memory",
  "trust your fingers not your eyes",
  "each key has one clear job",
  "smooth rhythm feels fast",
  "errors cost more than slow keys",
  "focus on the next letter",
  "good form lasts longer than luck",
  "small drills fix big habits",
  "type real words with intent",
  "pause at commas and periods",
  "read the line before you rush",
  "combo streaks reward clean runs",
  "misses teach where to drill",
  "eyes up when you are ready",
  "land on home after every reach",
  "alternate hands when you can",
  "the cat sat on a mat",
  "a red bird sang at dawn",
  "fresh air clears the mind",
  "kind words help teams grow",
  "clear goals keep practice fun",
  "start easy then add speed",
  "one finger one key at a time",
  "the lad had a salad",
  "dad asks a lad to fall",
  "fall leaves drift slow",
  "sad days pass like clouds",
  "a lad can ask for help",
  "all falls end in rest",
  "ask then act with care",
  "lad and dad share lunch",
  "salad and falls sound odd",
  "a sad lad had salad",
  "dad falls then asks why",
  "falls ask for steady feet",
  "a calm lad reads at dusk",
  "sad falls fade by dawn",
  "ask dad about the falls",
];

export function filterSentences(keys: string): string[] {
  return SENTENCE_BANK.filter((s) => charsetValid(s, keys));
}

export function generateSentencePrompt(
  keys: string,
  targetLength: number,
  stats?: KeyStatMap,
  preferShort = false,
): string {
  let pool = filterSentences(keys);
  if (pool.length === 0) {
    pool = filterSentences("abcdefghijklmnopqrstuvwxyz ");
  }
  if (pool.length === 0) return "type slow and clean";

  const focus = weakestKey([...new Set(keys.replace(/ /g, ""))], stats);
  const weighted = pool.flatMap((sentence) =>
    focus && sentence.includes(focus) ? [sentence, sentence] : [sentence],
  );
  if (stats) {
    weighted.sort((a, b) => scoreTextWeakness(b, stats) - scoreTextWeakness(a, stats));
  }
  if (preferShort) {
    weighted.sort((a, b) => a.length - b.length);
  }

  let out = assembleUnits(weighted, targetLength, " ", keys);
  if (out.length < Math.min(targetLength, 24) && weighted.length > 0) {
    out = weighted.slice(0, 3).join(" ");
    if (out.length > targetLength) out = out.slice(0, targetLength).trimEnd();
  }
  return out;
}
