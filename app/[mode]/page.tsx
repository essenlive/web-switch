'use client'

import { useMachine } from '@xstate/react';
import { MotionConfig } from 'motion/react';
import switchMachine from "@/lib/switchMachine"
import { useEffect, useMemo, useRef, useState } from 'react'
import { EndScreen } from "@/components/endScreen";
import { Score } from "@/components/score";
import { Grid } from "@/components/grid";
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { matrixFromParams, GROW_MS } from "@/lib/matrixHelpers"
import { useToast } from "@/hooks/use-toast";
import { useControls } from '@/hooks/use-controls';
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getRandomString } from "@/lib/utils";
import { InputList } from '@/components/inputList';
import { useCommunity } from '@/hooks/useCommunity';
import { publishScore } from '@/lib/nostr';
import { rankOf } from '@/lib/scoreEvent';
import type { Direction } from '@/lib/switchMachine';

export default function Page() {
  const router = useRouter()
  const { toast } = useToast()
  const { mode } = useParams<{ mode: string }>()
  const searchParams = useSearchParams()
  const s : string = searchParams.get('s') || '', 
    cs: string = searchParams.get('cs') || '',
    c: string = searchParams.get('c') || '',
    t: string = searchParams.get('t') || ''
    // , fh: string = searchParams.get('fh') || ''

  // Get canva from params
  const { validParams, error, input } = useMemo(() => matrixFromParams({ s, cs, c, t }), [s, cs, c, t])

  // Redirect if params are wrong
  useEffect(() => {
    if (!validParams) {
      toast({
        title: "Wrong url",
        description: `That grid link is not valid (${error}). Taking you back to the start.`,
        duration: 2500
      })
      setTimeout(()=> {router.push("/")}, 2500)
    }
  }, [validParams, toast, error, router]);
  
  const [snapshot, send] = useMachine(switchMachine, { input: input });
  const { nickname } = useCommunity();
  

  const [localHighscores, setLocalHighscores] = useLocalStorage<object>("localHighscores", { [snapshot.context.url]: null })
  
const [localHighscoresInputs, setLocalHighscoresInputs] = useLocalStorage<object>("localHighscoresInputs", { [snapshot.context.url]: null })
  
  const localHighscoreInputs = useMemo(() => {
    if (!localHighscoresInputs[snapshot.context.url]) localHighscoresInputs[snapshot.context.url] = null;
    return (localHighscoresInputs[snapshot.context.url])    
  }, [localHighscoresInputs, searchParams, snapshot.value, snapshot.context.url])

  const localHighscore = useMemo(() => {
    if (!localHighscores[snapshot.context.url]) localHighscores[snapshot.context.url] = null;
    return (localHighscores[snapshot.context.url])    
  }, [localHighscores, searchParams, snapshot.value, snapshot.context.url])

  // Time challenge clock: starts at the first move attempt, ms are sent with every move and tick
  const timer = snapshot.context.timerMode
  const startRef = useRef<number | null>(null)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const clock = () => startRef.current === null ? 0 : Math.round(performance.now() - startRef.current)
  const resetClock = () => { startRef.current = null; setRunning(false); setElapsed(0) }
  const play = (direction: Direction) => {
    if (timer && startRef.current === null) { startRef.current = performance.now(); setRunning(true) }
    send({ type: "input_move", params: { direction, at: timer ? clock() : undefined } })
  }
  const restart = () => { resetClock(); send({ type: 'restart_game', params: { input: null } }) }

  // Time challenge: a game ends won (Game_End) or lost (Game_Over). Records are compared by rank, see rankOf.
  const lost = snapshot.value === "Game_Over"
  const ended = snapshot.value === "Game_End" || lost
  const rank = rankOf(!lost, snapshot.context.score, snapshot.context.minArea)

  useEffect(() => {
    if (!ended) return
    if (localHighscores[snapshot.context.url] === null || localHighscores[snapshot.context.url] > rank) {
      localHighscores[snapshot.context.url] = rank;
      setLocalHighscores(localHighscores)
      // Timed games keep their timestamps too: the score cannot be re-published (nickname change) without them
      const { inputList: inputs, times, endAt } = snapshot.context
      const end = lost ? endAt : undefined
      localHighscoresInputs[snapshot.context.url] = timer ? { inputs, times, end } : inputs;
      setLocalHighscoresInputs(localHighscoresInputs)
      // Seul un nouveau record est publié (l'événement est remplaçable : un pire score écraserait le meilleur)
      if (nickname) publishScore(snapshot.context.url, { nickname, inputs, ...(timer ? { times, end } : {}) })
    }
  }, [ended, rank, snapshot.context.url, localHighscores, setLocalHighscores, nickname])

  // Growth does not wait for a move: tell the machine what time it is
  useEffect(() => {
    if (!timer || !running || ended) return
    const id = setInterval(() => {
      const at = clock()
      setElapsed(at)
      send({ type: 'tick', params: { at } })
    }, 250)
    return () => clearInterval(id)
  }, [timer, running, ended, send])
  

  // Add random string to useEffect to avoid hydration errrors
  const [randomString, setRandomString] = useState("");
  useEffect(()=>{
    setRandomString(getRandomString());
    resetClock()
    send({ type: "restart_game", params: { input } })
  },[input, send])
  
  const gestureHandlers = useControls({
    "SwipeUp": () => play("up"),
    "SwipeRight": () => play("right"),
    "SwipeDown": () => play("down"),
    "SwipeLeft": () => play("left"),
    "ArrowUp": () => play("up"),
    "ArrowRight": () => play("right"),
    "ArrowDown": () => play("down"),
    "ArrowLeft": () => play("left"),
    "Space": restart,
  });
  

  const title = `${snapshot.context.timerMode ? "Time challenge" : mode === "g" ? "Daily" : mode === "r" ? "Random" : "Shared"} grid ${cs || "6x8"}`
  // Score bar shows the best as moves, or as the smallest area reached if it was a lost game
  const highscoreLabel = localHighscore === null ? null : localHighscore < 1000 ? localHighscore : `${Math.floor(localHighscore / 1000)} tiles`

  return (
    <MotionConfig reducedMotion="user">
    <main className="grow flex flex-col items-stretch justify-stretch h-full w-full space-y-4">
      {/* swipes work from the board and the score row, not the scrolling move strip */}
      <div className="grow flex flex-col space-y-4" {...gestureHandlers}>
        {!ended && (
          <div className="grow flex flex-col p-4 bg-background rounded-lg">
            <h2 className="text-sm font-bold text-muted-foreground">{title}</h2>
            <Grid
              className={""}
              canva={snapshot.context.canva}
              canvaIndexes={snapshot.context.canvaIndexes}
              cursor={snapshot.context.cursor}
              lastMove={snapshot.context.inputList.at(-1) ?? null}
              moveId={snapshot.context.score}
            />
          </div>
        )}
        <span role="status" className="sr-only">
          {ended ? (lost ? `The grid outgrew you after ${snapshot.context.score} moves.` : `Solved in ${snapshot.context.score} moves.`) : ""}
        </span>
        <EndScreen
          className={"grow"}
          visible={ended}
          lost={lost}
          area={snapshot.context.minArea}
          url={snapshot.context.url}
          restart={restart}
          score={snapshot.context.score}
          inputsList={snapshot.context.inputList}
          highscoreInputs={Array.isArray(localHighscoreInputs) ? localHighscoreInputs : localHighscoreInputs?.inputs ?? null}
          highscore={localHighscore}
          initialCanva={snapshot.context.initialCanva}
        />
        <Score
          className={""}
          randomUrl={mode === "r" ? `/r?s=${randomString}&cs=${cs ?? "6x8"}` : null}
          restart={restart}
          score={snapshot.context.score}
          highscore={highscoreLabel}
          growIn={timer ? Math.ceil((GROW_MS - (elapsed % GROW_MS)) / 1000) : null}
        />
      </div>
      <div className="bg-background rounded-lg px-4">
        <InputList 
          inputList={snapshot.context.inputList}
          inputIndex={snapshot.context.score - 1} 
        />
      </div>
    </main>
    </MotionConfig>
  );
}
