'use client'

import { useMachine } from '@xstate/react';
import switchMachine from "@/lib/switchMachine"
import { useEffect, useMemo, useState } from 'react'
import { EndScreen } from "@/components/endScreen";
import { Score } from "@/components/score";
import { Grid } from "@/components/grid";
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { matrixFromParams } from "@/lib/matrixHelpers"
import { useToast } from "@/hooks/use-toast";
import { useControls } from '@/hooks/use-controls';
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getRandomString } from "@/lib/utils";
import { InputList } from '@/components/inputList';
import { useCommunity } from '@/hooks/useCommunity';
import { publishScore } from '@/lib/nostr';

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
        description: `The url is not correct : ${error}, redirecting you.`,
        duration: 5000
      })
      setTimeout(()=> {router.push("/")}, 1000)
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

  useEffect(() => {
    if (snapshot.value !== "Game_End") return
    if (localHighscores[snapshot.context.url] === null || localHighscores[snapshot.context.url] > snapshot.context.score) {
      localHighscores[snapshot.context.url] = snapshot.context.score;
      setLocalHighscores(localHighscores)
      localHighscoresInputs[snapshot.context.url] = snapshot.context.inputList;
      setLocalHighscoresInputs(localHighscoresInputs)
      // Seul un nouveau record est publié (l'événement est remplaçable : un pire score écraserait le meilleur)
      if (nickname) publishScore(snapshot.context.url, { nickname, inputs: snapshot.context.inputList })
    }
  }, [snapshot.value, snapshot.context.url, localHighscores, setLocalHighscores, snapshot.context.score, nickname])
  

  // Add random string to useEffect to avoid hydration errrors
  const [randomString, setRandomString] = useState("");
  useEffect(()=>{
    setRandomString(getRandomString());
    send({ type: "restart_game", params: { input } })
  },[input, send])
  
  const gestureHandlers = useControls({
    "SwipeUp": () => {send({type : "input_move", params : {direction : "up"}})},
    "SwipeRight": () => {send({ type: "input_move", params: { direction: "right" } })},
    "SwipeDown": () => {send({ type: "input_move", params: { direction: "down" } })},
    "SwipeLeft": () => {send({ type: "input_move", params: { direction: "left" } })},
    "ArrowUp": () => {send({ type: "input_move", params: { direction: "up" } })},
    "ArrowRight": () => {send({ type: "input_move", params: { direction: "right" } })},
    "ArrowDown": () => {send({ type: "input_move", params: { direction: "down" } })},
    "ArrowLeft": () => {send({ type: "input_move", params: { direction: "left" } })},
    "Space": () => {send({ type: "restart_game", params: { input: null } })},
  });
  

  return (
    <main className="grow flex flex-col items-stretch justify-stretch h-full w-full space-y-4">
      <EndScreen
          className={""}
          visible={snapshot.value === "Game_End"}
          url={snapshot.context.url}
          restart={() => send({ type: 'restart_game', params: { input: null } })}
          score={snapshot.context.score}
          inputsList={snapshot.context.inputList}
          highscoreInputs={localHighscoreInputs}
          highscore={localHighscore}
          initialCanva={snapshot.context.initialCanva}

        />
      
      { snapshot.value !== "Game_End" && 
        <div className="flex grow p-4 bg-background rounded-lg relative"  {...gestureHandlers}>
          <h3 className="absolute top-4 left-4 text-slate-500 font-bold text-l">{snapshot.context.url.replace("?","")}</h3>
          <Grid 
            className={""}
            canva={snapshot.context.canva}
            canvaIndexes={snapshot.context.canvaIndexes}
            cursor={snapshot.context.cursor}
          />
        </div>
      }
      <Score
        className={""}
        randomUrl={mode === "r" ? `/r?s=${randomString}&cs=${cs ?? "6x8"}` : null}
        restart={() => send({ type: 'restart_game', params: { input: null } })}
        score={snapshot.context.score}
        highscore={localHighscore}
      />
      <div className="bg-background rounded-lg px-4">

              <InputList 
                inputList={snapshot.context.inputList}
                inputIndex={snapshot.context.score - 1} 
                />
      </div>
    </main>


  );
}
