# Architecture

How switch is built today, written to answer one question: where does a new game mode plug in?

## 1. Game rules in code

The board is `number[][]` (values 1–4, row 0 at the bottom of the display). The cursor lives on a ring around the board: `x ∈ [0, width+1]`, `y ∈ [0, height+1]`, starting at `(0,0)`, value `1`.

- **Cursor move**: while on the border ring, a direction along the ring just moves the cursor.
- **Shift**: from a border cell, moving into the board pushes the cursor's tile into that row/column. The tile pushed out the far end becomes the new cursor value, and the cursor jumps to the opposite border.
- **Resize**: after every shift, any row/column that is uniformly one colour is removed (one per pass, repeated until none).
- **Win**: the board is ≤ 1 wide or ≤ 1 tall.
- **Score**: number of *accepted* moves (lower is better). A move that is rejected at the edge is not counted.

## 2. Files and responsibilities

| Layer | File | Role |
|---|---|---|
| Rules | [lib/switchMachine.ts](../lib/switchMachine.ts) | XState machine: the only place game state changes. |
| Board maths | [lib/matrixHelpers.ts](../lib/matrixHelpers.ts) | Pure helpers: shifts, `checkValues`, seeded `generateRandomMatrix`, `matrixFromParams` (URL → board). |
| Route | [app/[mode]/page.tsx](../app/%5Bmode%5D/page.tsx) | Wires URL → machine → UI, controls, local highscores, Nostr publish. |
| Verification | [lib/scoreEvent.ts](../lib/scoreEvent.ts) | `replay()` and `scoreFromEvent()`: trustless score recomputation. |
| Network | [lib/nostr.ts](../lib/nostr.ts) | Key storage, `publishScore`, `subscribeScores`. |
| Social | [hooks/useCommunity.ts](../hooks/useCommunity.ts), [lib/communityStorage.ts](../lib/communityStorage.ts), [lib/links.ts](../lib/links.ts) | Nickname, friends (max 30, `MAX_FRIENDS`, so the key + friends transfer link fits one QR code), friend/key links. |
| Leaderboard | [hooks/useCommunityScores.ts](../hooks/useCommunityScores.ts), [components/leaderboard.tsx](../components/leaderboard.tsx) | Subscribe, dedupe per pubkey, sort ascending. |
| UI | [components/](../components) (`grid`, `score`, `endScreen`, `inputList`, `helpScreen`, …) | Presentational; props only, no machine access. |
| Input | [hooks/use-controls.ts](../hooks/use-controls.ts) | Arrow keys, space, swipe → callbacks. |
| Entry | [app/page.tsx](../app/page.tsx), [next.config.ts](../next.config.ts) | Home cards; `/daily` and `/julie` redirects. |
| Solver | [lib/solver/](../lib/solver), [app/solver/page.tsx](../app/solver/page.tsx) | Hidden page that searches for a short winning move list. See section 9. |

Stack: Next.js (App Router, client pages), XState 5, Tailwind 4 + shadcn/Radix, `prando` for seeded randomness, `nostr-tools`. Tests: Vitest ([lib/scoreEvent.test.ts](../lib/scoreEvent.test.ts)).

## 3. The grid is the URL

A game is fully identified by a query string, which is the single source of truth for "what is this challenge":

| Param | Meaning |
|---|---|
| `s` | Seed → `generateRandomMatrix(s, rows, cols)` (Prando, redraws until no uniform row/col). |
| `c` | Explicit board as a digit string (alternative to `s`). |
| `cs` | `WxH`. Required. |
| `t` | `"true"` → time challenge (`timerMode`). Requires `s`. See section 8. |

`matrixFromParams({s, cs, c, t})` validates and returns `{ validParams, error, input: { canva, timerMode, url } }`. `input.url` is a **normalised** string (`?s=…&cs=WxH`, `?c=…&cs=WxH`, plus `&t=true` for the time challenge, so a mode's identity is part of the URL).

That normalised `url` is used as:
- the key of the local highscores (`localHighscores`, `localHighscoresInputs` in `localStorage`);
- the Nostr `d` tag, `switch:{url}`;
- the share link suffix (`https://switch.essenlive.xyz/g{url}`);
- the leaderboard identifier.

Routes: `app/[mode]/page.tsx` is one dynamic route. `mode` is any string; only `"r"` is special (shows the re-roll button, which generates a new random seed). In practice `/g` = a given grid (daily via the `/daily` redirect), `/r` = random.

## 4. The state machine

Context: `inputList` (accepted moves), `score`, `cursor`, `canva`, `canvaIndexes` (original row/col ids used by the grid for animation keys), `initialCanva`, `url`, and for the time challenge `timerMode`, `seed`, `grown`, `times`, `endAt`, `minArea`.

```
                 restart_game (any state) → set_game → Game_Idle
Game_Idle ──input_move──┬─ is_invalid_move ──────────► Game_Idle (nothing)
                        ├─ is_cursor_move ───────────► Game_Idle  [move_cursor, increment_score]
                        └─ otherwise ────────────────► Game_Canva_Evaluation  [shift_canva, increment_score]
Game_Canva_Evaluation (always)
   ├─ is_win_condition ───────────► Game_End
   ├─ is_full_line ──[resize_canva, reenter]──► Game_Canva_Evaluation
   └─ otherwise ──────────────────► Game_Idle
   ├─ is_overgrown ───────────────► Game_Over   (time challenge only)
Game_End / Game_Over: terminal (only restart_game leaves them)
```
(Cursor moves also go through `Game_Canva_Evaluation`. In `Game_Idle`, `input_move` and `tick` first check `is_growth_due`, see section 8.)

Facts that matter for extending it:

- `restart_game` with `input: null` reuses `initialCanva` (same grid); with an input it loads a new grid. `set_game` resets score/cursor/inputList.
- Every action clones context with `structuredClone` and returns a new object. Follow that style.
- `increment_score` is what appends to `inputList`. Anything that must be replayable has to be a function of `inputList` (and the URL) only.
- The end of a game is detected from `snapshot.value` (`Game_End` or `Game_Over`) in the page and in `replay()`. A new terminal state means updating both.

## 5. Page lifecycle ([mode]/page.tsx)

1. Read `s, cs, c, t` from the URL → `matrixFromParams` (memoised). Invalid → toast and redirect to `/` after 1 s.
2. `useMachine(switchMachine, { input })`. An effect sends `restart_game` whenever `input` changes (and sets a client-only random string, to avoid hydration mismatch).
3. `useControls` maps keys/swipes to `input_move`; space → `restart_game` with `null`.
4. On entering `Game_End`: if no local highscore for `context.url` or the new score is lower, store score + inputs in `localStorage`, and if a nickname exists, `publishScore(url, { nickname, inputs })`. Only records are published, because the Nostr event is replaceable and a worse score would overwrite the best.
5. Render: `EndScreen` when ended, otherwise `Grid`; `Score` bar; `InputList`.

## 6. Score verification ([scoreEvent.ts](../lib/scoreEvent.ts))

Event: kind `30078`, tags `d = switch:{url}` and `t = switch`, content `{ v: 1, nickname, inputs: Direction[] }`. It never contains the score.

`scoreFromEvent(event, url)` rejects unless: signature valid; `d` tag matches; `v === 1`; nickname is a string ≤ 20 chars; `inputs` is a non-empty array of at most 500 valid directions. Then `replay(url, inputs)`:
1. rebuilds the board from the URL via `matrixFromParams` (passing `t: ''`);
2. runs a real machine actor and sends each move;
3. rejects if a move comes after `Game_End`, if the game is not won at the end, or if `context.score !== inputs.length` (i.e. some move was ignored);
4. returns `context.score`.

So **the machine is the scoring rule**: change it and every historical score is recomputed under the new rule. The snapshot test exists to make that visible.

`useCommunityScores` keeps the newest event per pubkey and sorts by `score` ascending. `Leaderboard` only displays `s.score` as "N coups".

## 7. Extension points and traps for a new mode

Where a mode would naturally hook in:

1. **Machine**: add context from `input` (e.g. `timerMode`), extend events/states, keep all progression a pure function of the move list.
2. **Board generation**: `matrixHelpers.ts`. Anything the mode generates must come from the seed, using Prando, never `Math.random`.
3. **`matrixFromParams`**: validate the mode's params and normalise them into `url`.
4. **`replay`**: must mirror whatever the page does, because it is the verifier.
5. **UI**: `Score` and `EndScreen` take plain props; add props rather than reading the machine.
6. **Home**: `app/page.tsx` has the disabled "Time challenge Mode" card to enable.

Traps found while reading:

- **A mode's identity must be in the normalised `url`** (as `t=true` is). Otherwise it would share local highscores, the Nostr `d` tag and the leaderboard with the normal mode, and replay would verify its moves under the wrong rules.
- **Scores are compared as a `rank` number** (`rankOf` in scoreEvent.ts): a win is its moves, a loss is `1000 × smallest area + moves`. The page record check, `useCommunityScores` sort and the leaderboard label all use it.
- **Share links are hard-coded to `/g`** in [endScreen.tsx](../components/endScreen.tsx), and the leaderboard page builds `/g?s=…&cs=6x8` with a hard-coded size.
- **Only records are published**, so any "better score" notion must be defined once and used in the page check, the sort and the dedupe (dedupe is currently "newest event wins", relying on the page only publishing improvements).
- **`saveNickname` republishes `localHighscoresInputs`** keyed by url (a plain move list, or `{ inputs, times, end }` for timed games). A mode that needs more than the move list in its event must store it there too, otherwise the republished event is invalid and overwrites the good one.
- **`MAX_MOVES = 500`** caps replay length.
- **`useControls` keeps `moveThreshold` as a module-level variable**, which is fine for one board on screen, but is shared state.
- **Hydration**: anything time- or random-dependent must be set in an effect (the page already does this for the random string; `getDailyString` uses local time).
- **No tests for the machine itself**; the only coverage is through `scoreFromEvent`.

## 8. Time challenge

URL `?s=…&cs=WxH&t=true` (seed required). Clock starts at the first move attempt; the grid grows by one line every `growMs(canva)` (2000 ms × the smallest side of the current grid, e.g. 12x9 → 18000 ms) and the countdown restarts whenever a line is removed (row on top, then column on the right, alternating; new line from `growLine(seed, index)`), and the game is lost when a side exceeds `MAX_SIDE` (`Game_Over`).

- The machine never reads a clock. `input_move` and `tick` events carry `at` (ms since the clock started). In `Game_Idle`, if `at - clockBase >= growMs`, one growth step runs (`clockBase` then advances by `growMs`), the grid is evaluated, and the event is re-raised until no growth is due; then the move is played.
- The page sends `tick` every 250 ms and `at` with every move. Because growth depends only on `at` and the removals, a replay without ticks reaches the same states.
- Payload adds `times` (one per input) and `end` (time of the loss, if lost). `scoreFromEvent` bounds them (integers, increasing, ≥ 50 ms apart, ≤ 30 min). **They are self-reported: a cheater can claim faster play.** This is the one part of the system that is not trustless.
- Changing `growMs`, `MAX_SIDE` or `growLine` changes every shared time-challenge result.

## 9. Solver (hidden page)

`/solver?s=…&cs=WxH` (or `c=…`, the same params as a game, no `t`) searches for a short winning move list in the browser. It is a tool, not a game mode: nothing links to it, the layout sets `robots: noindex`, and it never publishes anything to Nostr or touches highscores. The best solution is opened in `/replay` through the usual link (`/replay{url}&i={moves}`).

| File | Role |
|---|---|
| [lib/solver/simulate.ts](../lib/solver/simulate.ts) | Allocation-free copy of the rules (`step`, `isWon`, `nearness`). No imports, so it runs in a worker and in node. |
| [lib/solver/simulate.test.ts](../lib/solver/simulate.test.ts) | Plays thousands of random moves through both this simulator and the real machine, comparing grid, cursor, held tile, accepted/ignored and win after every move. |
| [lib/solver/ga.ts](../lib/solver/ga.ts) | `createGA(canva, options).step()`: one generation per call, returns `GAStats`. Pure and seeded (mulberry32), same grid and seed give the same run. |
| [lib/solver/worker.ts](../lib/solver/worker.ts) | Web Worker: runs `step()` in 100 ms slices, posts the stats, keeps improving after a win until it receives `stop`. |
| [app/solver/page.tsx](../app/solver/page.tsx) | Starts the worker, shows generation / tiles left / moves / status, a tiles-left chart, the solution string, Start/Stop and the replay link. |
| [scripts/solver-bench.ts](../scripts/solver-bench.ts) | Headless benchmark (see below). |

### Why a second copy of the rules

The machine clones its whole context on every action, far too slow for millions of moves. `simulate.ts` keeps a flat `Uint8Array` (row-major, row 0 at the bottom like `canva`), the cursor and the held tile, and mutates them in place. **It must stay identical to `switchMachine.ts` and `matrixHelpers.ts`**, quirks included (for example the cursor `y` or `x` is decremented for whichever row or column is removed, and rows are removed before columns, one per pass). The equivalence test is what keeps the two in sync: if you change a rule in the game, it fails until the simulator follows. Time challenge is out of scope (no growth, no `tick`).

### How the search works

A **genome** is a fixed-length string of moves (0..3 = `u r d l`, the letters of a replay link). The game ignores a move it cannot play, so every genome is valid and needs no repair; only *accepted* moves count, and the solution string only contains those.

**Fitness** (lower is better):
- a win scores the moves played, so the search keeps shortening solutions;
- anything else scores the best position reached along the genome: `tileWeight × tiles left + nearness + moveWeight × moves played`. The genome's *used* length is that best prefix; the tail keeps drifting and exploring.

`nearness(state)` is the smooth term that gives the search a slope while "tiles left" is flat. To win you must remove `rows − 1` rows or `cols − 1` columns; each line costs its tiles that are not the majority colour of that line; the heuristic is the sum of the cheapest `n − 1` lines, taking the better of rows and columns. It is a guide, not a bound.

**Operators.** Tournament selection of 3, elitism (2% of the population, at least 2). Single-point crossover, only between genomes that share the same starting position (a tail is meaningless from another position). Mutations keep the head and change what follows: a different move, insert, delete, or redo of 2–8 moves; half of them fall inside the used prefix, half in the tail.

**Stages (beam of GAs).** One long genome is hopeless on 8×8, so the game is solved `length` moves at a time:
1. A *stage* evolves genomes from a pool of starting positions (the grid itself for stage 0) for `generations` generations. Genomes are spread round-robin over the pool.
2. At the end of the stage, the best `beam` *distinct* positions reached (deduplicated by a hash of grid, cursor and held tile) become the pool of the next stage, each with the moves that lead to it.
3. A win ends the *pass*. The next pass starts over from the grid and can only win with fewer moves than the best solution (longer attempts are scored `HOPELESS` and cut off early).
4. A pass also starts over after 3 stages without progress or `maxStages` stages.

Defaults: population 1000, length 50, beam 100, generations 15, maxStages 30, tileWeight 8, moveWeight 1, seed 1. The page lets you change population and moves per stage.

### Benchmark and results

`scripts/solver-bench.ts` runs the search without the browser. Bundle it (`npx esbuild scripts/solver-bench.ts --bundle --platform=node --format=esm --outfile=bench.mjs`), then `GA='{"moveWeight":1}' node bench.mjs <seeds> <RxC> <generations> <population> <length>`. It prints the first-win generation, the final result and the average. `GA` is a JSON merged into the options.

Measured on four 8×8 grids (seeds `bench0`..`bench3`, population 1000, 50 moves per stage):

| Setup | Result |
|---|---|
| Single stage, 150 moves, population 400 | wins only some grids, slowly, about 100–140 moves |
| Staged, ranked by tiles only (`moveWeight 0`) | wins everywhere within 76 generations (about 4 s), 126 moves on average |
| Staged, `moveWeight 1` (default) | 99.5 moves on average |

`moveWeight 0.5` gives 106.5; 2 and above stall some grids (no win at all). Beam 300 and 30 generations per stage give the same result as the defaults. 6×6 is solved in seconds. Not benchmarked yet: 10×10 and larger.

### Known limits and ideas

- Solutions are still long (around 100 moves on 8×8); the real minimum is unknown.
- After the first win, later passes almost never find a shorter one. A polishing phase (a GA on the full solution seeded from the best one, with delete / insert / rewrite mutations) is the likely next step.
- `nearness` is recomputed after every accepted move and is the main cost; it could be evaluated less often.
- The chart is flat after the first win, because the headline stays on the best solution.
- The solver says nothing about the leaderboard: a solver-found list is a valid score for `scoreFromEvent`, nothing in the app tells it apart from a human one.
