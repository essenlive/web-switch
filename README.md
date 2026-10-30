## Getting Started

Small game inspired from Russpack. Maybe it is the same, I don't remember the game correctly.

## Stack

This is project uses : 
 - [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
 - [Xstate](https://stately.ai/docs)to manage the state machine.
 - [Tailwind CSS](https://tailwindcss.com/) for styling.
 - [Shadcn](https://ui.shadcn.com/) For the UI components.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

The machine logic is in `app/swapMachine.ts`, you can preview it with the [xstate vscode extension](https://marketplace.visualstudio.com/items?itemName=statelyai.stately-vscode).


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Solver

A hidden page searches for a short solution of a grid, in the browser (genetic search in a Web Worker): open `/solver?s=abc&cs=8x8` (same params as a game) and press Start. Nothing links to it. With `NEXT_PUBLIC_BOT_NSEC` in `.env.local` (local use only, the variable is public), it publishes its best solutions as `the-bot`. How it works, results and limits are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#9-solver-hidden-page).

## Todo

 - [x] Swipe gestures
 - [x] Session highscore
 - [x] Add interface (start / game / win)
 - [x] Add buttons, restart, keys, kbd shortcuts
 - [x] Add mode daily
 - [x] Share button
 - [x] Improve mobile controls
 - [x] Check initial grid lines
 - [x] Add mode random
 - [x] LocalStore session
 - [-] Add settings
 - [-] Add animation
 - [-] Add better score sharing (add to local sessions)
 - [ ] Add mode timer
 
 - [x] Solver (hidden `/solver` page)
