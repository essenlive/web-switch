# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Casual mobile players in short sessions on a phone, playing by swipe. Desktop keyboard play (arrows, space to restart) is supported but secondary.

## Product Purpose
Switch is a small line-shifting puzzle game: move a cursor to switch rows and columns, align same-colored tiles so they disappear, and win when the grid is one square wide in any direction. Success is solving the grid in the fewest moves.

## Positioning
A faithful, playable revival of Russpack, a game the author played on the Archos Gmini400 media player, rebuilt because no playable instance could be found (credit to the original creator). Everyone shares the same daily grid alongside unlimited random grids, and scores and friends live on Nostr with no account or signup.

## Operating Context
Modes: daily (shared seeded grid) and random. Session scores and highscores are kept in local storage. Scores can be shared, and a community leaderboard with friends and identity backup runs on Nostr. Usage tracking is minimal, via Umami.

## Capabilities and Constraints
Next.js app with XState state machine, Tailwind, shadcn/Radix UI. Swipe and keyboard controls, start/game/win screens, help screen, light/dark theme following the system. English only. Settings, animation, better score sharing are partially done; a timer mode is planned.

## Brand Commitments
Name is lowercase "switch". Stays tiny and free: no accounts, ads, or heavy dependencies. Credit to the original Russpack creator is retained in the About copy.

## Evidence on Hand
No testimonials, user numbers, or press. Do not fabricate any.

## Product Principles
1. Playable in seconds on a phone, with no signup.
2. Honor the original: revive, don't reinvent the rules.
3. Social without accounts: Nostr identity is optional and user-owned.
4. Stay small: every addition must justify its weight.

## Accessibility & Inclusion
Required: full keyboard play, light/dark parity, reduced-motion respect, and tiles distinguishable without relying on color alone.
