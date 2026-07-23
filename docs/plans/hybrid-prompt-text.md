# Hybrid Typing Text — Implementation Plan

## Problem (current state)

All missions and drills call `generatePrompt()` in `src/game/prompts.ts` — a per-character digraph chain with no word boundaries. Early placement missions (1–4) produce long gibberish instead of intentional finger drills. Drills like Home Return glue `reach+home` (`eaf`) without spacing.

**Level curriculum is correct; prompt generation is not.**

## Design principles

1. **Readable units** — spaces between chunks/words; never a 60-char blob.
2. **Pedagogy first (1–4)** — curated chunks teach finger/hand patterns; order is intentional.
3. **Adaptive without gibberish (5+)** — weak-key bias picks *which* chunk/word/sentence, not random letters.
4. **Charset-safe** — every output char ∈ level `keys`; validated in tests.
5. **Single API** — `buildSessionPrompt({ mode, keys, targetLength, ... })`.

## Prompt modes by stage

| Levels | Mode | Purpose |
|--------|------|---------|
| 1–4 | `pattern` | Finger placement chunks |
| 5–9 | `pseudo` | Keybr-style pronounceable pseudo-words |
| 10–12 | `sentence` | Filtered real sentences |
| Practice | `sentence` or `pseudo` | Based on unlocked charset |
| Drills | dedicated | One generator per drill type |

## Level 1–4 chunks (`src/game/promptChunks.ts`)

Generator cycles chunk groups until `targetLength`, trims on space boundary. Weak-key chunks appear 2× when `keyStats` shows misses.

### Level 1 — `asl;`
```
a a a a
s s s s
l l l l
; ; ; ;
a s    s a
l ;    ; l
a l    l a
s ;    ; s
a s l ;
```

### Level 2 — `asdf`
```
a s d f
f a d s
sad    fad    dad
a d a d
f d f d
fad sad dad
```

### Level 3 — `jkl;`
```
j k l ;
l k j ;
; l k j
j l ; j
j k    k j
l ;    ; l
j k l ;
```

### Level 4 — `asdfjkl; `
```
a sad lad
fall falls
a lad asks
salad falls
sad lad falls
dad asks lad
```
(Author only charset-valid words; validate in tests.)

## Levels 5–9 (`src/game/pseudoWords.ts`)

- Syllable templates from allowed pool
- 2–4 syllable words, space-separated
- Reject/regenerate if char ∉ `keys`
- Weak-key bias on syllable letters
- L7+: alternate LH/RH biased words

## Levels 10–12 (`src/game/sentences.ts`)

- ~40–60 short sentences
- `filterSentences(keys)` — charset filter
- Concatenate 1–3 to reach length
- Weak-key bias by sentence score
- L12: prefer short phrases for Eyes Up

## Drill generators

| Drill | Output |
|-------|--------|
| Home Return | `e f  r f  t f` (spaced reach + home) |
| One Finger | `fff fff err rrr` |
| Alternating Hands | `as df jk sl ;a df` |
| Weak Finger | One Finger for weakest zone |
| Eyes Up | Short filtered sentences |

## API

```ts
// src/game/prompts.ts
export function buildSessionPrompt(opts: {
  mode: "pattern" | "pseudo" | "sentence" | "drill";
  keys: string;
  targetLength: number;
  levelId?: number;
  drill?: DrillKind;
  stats?: KeyStatMap;
  missCounts?: Record<string, number>;
  lockFinger?: FingerId;
}): string;
```

App.tsx:
```ts
const mode = id <= 4 ? "pattern" : id <= 9 ? "pseudo" : "sentence";
```

## File layout

```
src/game/
  prompts.ts          # router + charset utils
  promptChunks.ts     # L1–4
  pseudoWords.ts      # L5–9
  sentences.ts        # L10+
  keyBias.ts          # weakestKey, weaknessWeight
```

## Tests (`src/game/prompts.test.ts`)

- All chunks pass charset for their level
- Output length ~targetLength, trim on space
- Home Return has spaced pairs
- Weak-key statistical bias smoke test

## Implementation order

1. keyBias.ts
2. promptChunks.ts + pattern mode + App L1–4
3. Drill generators (spacing fixes)
4. pseudoWords.ts + App L5–9
5. sentences.ts + App L10–12, Practice, Eyes Up
6. prompts.test.ts
7. Remove legacy Markov DIGRAPHS

## Success criteria

- Mission 1 is readable placement drill
- Mission 4 has spaced home-row phrases
- Mission 10+ reads like real typing
- Drills match teaching intent
- 100% charset compliance in tests
