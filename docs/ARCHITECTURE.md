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
| Records | [components/records.tsx](../components/records.tsx) | World / community / own best of a grid with the owner's name; used by the score bar, `/replay` and `/solver` (reads the leaderboard hooks itself). |
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

`/solver?s=…&cs=WxH` (or `c=…`, the same params as a game, no `t`) searches for a short winning move list in the browser. Without params it opens on a picker of the benchmark grids. It is a tool, not a game mode: nothing links to it, the layout sets `robots: noindex`, and it never touches the local highscores. The best solution is opened in `/replay` through the usual link (`/replay{url}&i={moves}`). It can also publish its best solution to the leaderboard as `the-bot` (see "Publishing as the-bot" below).

| File | Role |
|---|---|
| [lib/solver/simulate.ts](../lib/solver/simulate.ts) | Allocation-free copy of the rules (`step`, `isWon`, `nearness`). No imports, so it runs in a worker and in node. |
| [lib/solver/simulate.test.ts](../lib/solver/simulate.test.ts) | Plays thousands of random moves through both this simulator and the real machine, comparing grid, cursor, held tile, accepted/ignored and win after every move. |
| [lib/solver/ring.ts](../lib/solver/ring.ts) | The cursor ring and its slots: `applySlot` (walk to a slot and push), `slotLetters`, `walkDistance`. See "Pushes instead of moves". |
| [lib/solver/ga.ts](../lib/solver/ga.ts) | `createGA(canva, options).step()`: one generation per call, returns `GAStats`. Pure and seeded (mulberry32), same grid and seed give the same run. |
| [lib/solver/beam.ts](../lib/solver/beam.ts) | `createBeam(canva, options).step()`: one layer of a beam search over pushes per call, same `GAStats`. Deterministic. |
| [lib/solver/exact.ts](../lib/solver/exact.ts) | `solveExact`: exhaustive shortest solution (or a lower bound) for small grids. Used to measure the others, not shipped in the page. |
| [lib/solver/ga.test.ts](../lib/solver/ga.test.ts), [ring.test.ts](../lib/solver/ring.test.ts), [beam.test.ts](../lib/solver/beam.test.ts) | `prune`; ring numbering and walks played move by move; `solveExact` against a search over single moves; the beam's solution played in the real machine. |
| [lib/solver/bench.test.ts](../lib/solver/bench.test.ts) | The benchmark (skipped unless asked, see below). |
| [lib/solver/worker.ts](../lib/solver/worker.ts) | Web Worker: runs `step()` in 100 ms slices, posts the stats, keeps improving after a win until it receives `stop`. |
| [lib/solver/engines.ts](../lib/solver/engines.ts) | The engines as data: `ENGINE_PRESETS`, the option fields of each kind (`FIELDS`: label, hint, default), and `createEngine(kind, canva, options)`, which the worker and the benchmark both use. |
| [lib/solver/benchGrids.ts](../lib/solver/benchGrids.ts) | The 13 fixed benchmark grids (`4x4:a` … `10x10:b`, seed `bench-<name>`). |
| [app/solver/page.tsx](../app/solver/page.tsx) | Grid picker (benchmark grids, or a seed and a size, or the link's params), the grid, then two tabs. |
| [app/solver/run.tsx](../app/solver/run.tsx) | **Run** tab: one engine on the grid, with an optional time limit, stats, two charts, the solution, the replay link. Posts to the-bot (never on benchmark grids). |
| [app/solver/benchmark.tsx](../app/solver/benchmark.tsx) | **Benchmark** tab: tick grids and engines, a time per search, run them one after the other; table of moves (best of the row underlined, first solution and when, replay link per cell, average per engine), "Copy report". |
| [app/solver/variants.tsx](../app/solver/variants.tsx) | The list of engine variants: pick (one, or several for the benchmark), rename, edit every option, duplicate, remove, reset. |
| [app/solver/useSolverWorker.ts](../app/solver/useSolverWorker.ts) | One worker, a start cancels the previous run and its late messages are ignored. |

### Why a second copy of the rules

The machine clones its whole context on every action, far too slow for millions of moves. `simulate.ts` keeps a flat `Uint8Array` (row-major, row 0 at the bottom like `canva`), the cursor and the held tile, and mutates them in place. **It must stay identical to `switchMachine.ts` and `matrixHelpers.ts`**, quirks included (for example the cursor `y` or `x` is decremented for whichever row or column is removed, and rows are removed before columns, one per pass). The equivalence test is what keeps the two in sync: if you change a rule in the game, it fails until the simulator follows. Time challenge is out of scope (no growth, no `tick`).

### Pushes instead of moves (ring.ts)

The cursor walks on a ring of `2 × (rows + cols) + 4` cells around the grid, and walking never changes the grid. So any list of moves is "walk, push, walk, push…", and the walk between two pushes can always be the shorter way round the ring without costing a move more. A **slot** is a ring cell that is not a corner (`2 × (rows + cols)` of them); `applySlot(state, slot)` teleports the cursor there and pushes, the cost being `walkDistance + 1`. Searching over slots loses no solution and drops every wasted cursor move; the tests check it (the optimum found over slots equals the one found by a search over single moves, and a slot played as letters gives the same position as `applySlot`).

### Exact search (exact.ts)

`solveExact` is a uniform-cost search over slots with every position remembered (`stateKey`, a 52-bit hash of grid, cursor and held tile), so the first win it pops is the optimum. It finishes on 4×4 and 5×5 in seconds, and gives up on bigger grids after `maxNodes` positions saying `lowerBound`. It is the yardstick of the benchmark.

### Beam search (beam.ts)

Layer by layer, every kept position is pushed in every slot; candidates are ranked with the same cost as the genetic search (`8 × tiles left + nearness + moves played`), deduplicated by `stateKey` (keeping the fewest moves), and the `width` cheapest make the next layer. A push that wins is pruned (`prune`) and kept if it is the shortest so far; a position that cannot beat the best solution is dropped. When a round has no layer left, the width doubles (25, 50, … 25 600) and the round starts again, then `done`. No randomness: same grid, same result. One `step()` is one layer, reported as `pass` = round and `stage` = layer.

### How the genetic search works

A **genome** is a fixed-length string of moves (0..3 = `u r d l`, the letters of a replay link). The game ignores a move it cannot play, so every genome is valid and needs no repair; only *accepted* moves count, and the solution string only contains those.

**Fitness** (lower is better):
- a win scores the moves played, so the search keeps shortening solutions;
- anything else scores the best position reached along the genome: `tileWeight × tiles left + nearness + moveWeight × moves played`. The genome's *used* length is that best prefix; the tail keeps drifting and exploring.

`nearness(state)` is the smooth term that gives the search a slope while "tiles left" is flat. To win you must remove `rows − 1` rows or `cols − 1` columns; each line costs its tiles that are not the majority colour of that line; the heuristic is the sum of the cheapest `n − 1` lines, taking the better of rows and columns. It is a guide, not a bound.

**Operators.** Tournament selection of 3, elitism (2% of the population, at least 2). Single-point crossover, only between genomes that share the same starting position (a tail is meaningless from another position). Mutations keep the head and change what follows: a different move, insert, delete, or redo of 2–8 moves; half of them fall inside the used prefix, half in the tail.

**Stages (beam of GAs).** One long genome is hard on 8×8, so the game can be solved `length` genes at a time. `maxStages = 1` is the plain GA instead: one stage that never ends by itself (`generations` is ignored), only a win restarts it.
1. A *stage* evolves genomes from a pool of starting positions (the grid itself for stage 0) for `generations` generations. Genomes are spread round-robin over the pool.
2. At the end of the stage, the best `beam` *distinct* positions reached (deduplicated by a hash of grid, cursor and held tile) become the pool of the next stage, each with the moves that lead to it.
3. A win ends the *pass*. The next pass starts over from the grid and can only win with fewer moves than the best solution (longer attempts are scored `HOPELESS` and cut off early).
4. A pass also starts over after 3 stages without progress or `maxStages` stages.

**Push genes.** With `pushes: true` a gene is a push, not a move: a byte around 128 read as a signed distance along the ring from the cursor (small distances are the most likely), and `length` counts pushes. It gave worse results than plain moves with long stages, and about the same with short ones (6 to 10 pushes). It is kept as an option, not used by the page.

**Pruning.** Every winning solution goes through `prune(canva, moves)` before it is kept: it repeatedly removes any run of 1 to 8 moves whose removal still wins with fewer moves (an `ud` in a side column, an `lr` along an edge…), until nothing can be cut. The GA is blind to these detours because the tail of a genome is free; pruning cleans them. `prune` replays moves on the simulator, so `GAStats.solution` is always a clean list of accepted moves.

Engine defaults: population 1000, length 50, beam 100, generations 15, maxStages 30, tileWeight 8, moveWeight 1, seed 1. The page starts from its first preset (population 1500, 60 moves, 1 stage) and offers others (staged 60 moves, staged fast for small grids 400 / 50, staged for large grids 1000 / 100, single stage 80 moves); editing a field switches the menu to "Custom". Fields are locked while running.

### Publishing as the-bot

When the page reaches a solution shorter than the last one it sent, it calls `publishBotScore(url, solution)` ([lib/nostr.ts](../lib/nostr.ts)). That function does nothing unless `NEXT_PUBLIC_BOT_NSEC` is set (an `nsec`, put in `.env.local`, which `.gitignore` excludes). Then it:
1. replays the solution with `replay()` and drops it if it does not win;
2. reads the bot's own published score for that grid and drops the solution unless it beats it (the event is replaceable, so a worse one would overwrite the best);
3. publishes a normal score event (kind `30078`, nickname `the-bot`), identical to a human one. It then shows on the leaderboards and in the `Records` bars as the world record holder.

**Security: `NEXT_PUBLIC_` variables are inlined into the JavaScript sent to every visitor.** Set the key only in a local `.env.local` and run the page locally. If it is set in the environment of a deployed build, anyone can read the bot's secret key in the bundle.

### Benchmark and results

Two ways to run it. The **Benchmark** tab of `/solver` runs any variant of any engine (every option editable, variants duplicable) on any of the grids, one search at a time on one worker, and shows a table with a text report to copy. The exact search only runs on grids of 25 tiles or less. Timings there are comparable with each other, not with the script, which runs in node on the engines flagged `reference` in [engines.ts](../lib/solver/engines.ts).

`npm run solver:bench` ([bench.test.ts](../lib/solver/bench.test.ts), vitest, skipped unless `SOLVER_BENCH` is set, which the script does) runs every engine on a fixed set of grids (`generateRandomMatrix('bench-<name>', rows, cols)`) for `SOLVER_SECONDS` seconds each (default 10) and prints the moves of the best solution at the end and when the first one appeared. `SOLVER_GRIDS=8x8,10x10` and `SOLVER_ENGINES=beam,ga-staged` filter; `SOLVER_OUT=report.txt` also writes the report to a file, because vitest hides the console of passing tests. For grids up to 5×5 it also prints the optimum from `solveExact`.

Moves of the best solution after 10 s (one core, node):

| Grid | Optimum | ga-single | ga-staged | ga-push | beam |
|---|---|---|---|---|---|
| 4×4 a / b | 10 / 13 | 10 / 13 | 10 / 13 | 10 / 13 | 10 / 13 |
| 5×5 a / b | 18 / 18 | 18 / 19 | 18 / 18 | 18 / 18 | 18 / 18 |
| 6×6 a / b / c | ? | 42 / 27 / 40 | 38 / 29 / 34 | 37 / 31 / 37 | **32 / 27 / 37** |
| 8×8 a / b / c / d | ? | none | 96 / 95 / **59** / 81 | 105 / 90 / 77 / 68 | **78 / 78** / 66 / **61** |
| 10×10 a / b | ? | none | none | none | **217 / 147** |

- `ga-single`: population 1500, 60 moves, one stage (the page's first preset). `ga-staged`: 1000 / 50 moves / 30 stages. `ga-push`: 1000 / 8 pushes / 30 stages / `pushes`. `beam`: defaults.
- Small grids are not a problem: every engine is within one move of the optimum.
- From 6×6 up the beam is the best on average, finds a first solution in under 0.3 s even on 10×10, and is the only one that wins at all on 10×10 in 10 s. The genetic searches win some 8×8 grids by a few moves (8×8 c).
- 10×10 solutions of 150 to 220 moves are certainly far from the optimum: the heuristic, not the time, is the limit there.
- The staged genetic search on its own, before the beam existed, averaged 99.5 moves on four other 8×8 grids (`bench0..3`); a move weight of 1 in the ranking was the one parameter that mattered (0 gave 126, 2 and above stalled some grids).

### Known limits and ideas

- Above 6×6 nobody knows the optimum, so there is no measure of the gap. A better exact search (an admissible bound on the moves left) would extend the yardstick.
- Polishing: take the best solution and, for every window of 8 to 12 moves, search exhaustively for a shorter way to the same position (a generalisation of `prune`, which can only delete). Also restarts from a prefix of the best solution.
- The heuristic (`nearness`) ignores the held tile and the walk to the useful slot. Improving it helps the beam most, and big grids most of all.
- The beam keeps the cheapest positions only; it has no diversity. Keeping the best few of each kind of position (by tiles left, by lines near completion) is the usual fix.
- `nearness` is recomputed from scratch for every candidate and is the main cost; a push changes one line (unless a line is removed), so it could be incremental. Several workers with different widths could share the best length.
- `prune` is quadratic-ish and only looks at runs up to 8 moves.
- A bot score is indistinguishable from a human one for `scoreFromEvent` (only the nickname differs). `MAX_MOVES = 500` caps what is accepted, so a longer solution would be rejected.
