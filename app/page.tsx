'use client'

import Link from "next/link";
import { Sunrise, CircleArrowRight, Timer, Dices } from "lucide-react";
import { motion } from "motion/react"
import { useToast } from "@/hooks/use-toast";
import { getDailyString } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getRandomString } from "@/lib/utils";

export default function Home() {
  const { toast } = useToast()
  const notAvailable = () => {
    toast({
      title: "Mode not available yet",
      description: "I am working on it, stay tuned !",
      duration: 5000
    })
  }

    // Add random string to useEffect to avoid hydration errrors
    const [randomString, setRandomString] = useState("");
    useEffect(()=>{
      setRandomString(getRandomString());
    },[])
  
  return (
    <main className="grow flex flex-col items-stretch justfy-stretch h-full w-full space-y-4">
      <Link
        className="grow "
        href={{
          pathname: '/g',
          query: { 
            s: getDailyString(),
            cs: '6x8'
          },
        }} >
        <motion.div whileHover={{ scale: 1.05 }} className="grow flex flex-col p-4 bg-background cursor-pointer rounded-lg"> 
          <div className="py-4">

            <Sunrise size={32} />
          </div>
          <h2 className="text-2xl font-bold">
            Daily Mode
          </h2>
        <p className="grow text-xl my-4">
            Get a grid that changes everyday. Practice and try to solve the grid with as little moves as possible to improve your high score.  
          </p>
        <div className="flex justify-between items-center">
            <span className="text-xl font-bold">
                Play daily grid
            </span>
            <CircleArrowRight />
          </div>
          </motion.div>
      </Link>

      <Link
        className="grow "
        href={{
          pathname: '/r',
          query: {
            s: randomString,
            cs: '6x8'
          },
        }} >
        <motion.div whileHover={{ scale: 1.05 }} className="grow flex flex-col p-4 bg-background  rounded-lg "> 
          <div className="py-4">

            <Dices size={32} />
          </div>
          <h2 className="text-2xl font-bold ">
            Random Mode
          </h2>
          <p className="grow text-xl my-4">
            Get a random grid everytime, train yourself to spot the best switches in all the different scenarios. 
          </p>
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">
              Play random grid
            </span>
            <CircleArrowRight />
          </div >
        </motion.div >
      </Link>
      
      <Link onClick={notAvailable} href="" className="grow ">
        <motion.div whileHover={{ scale: 1.05 }} className="grow flex flex-col p-4 bg-background  cursor-not-allowed opacity-30 rounded-lg">

          <div className="py-4">

            <Timer size={32} />
          </div>
          <h2 className="text-2xl font-bold ">
            Time challenge Mode
          </h2>
          <p className="grow text-xl my-4">
            Solve the grid before it outgrows you.
          </p>
          <div className="flex justify-between items-center">
            <span className="font-bold text-xl">
              Play time challenge grid
            </span>
            <CircleArrowRight />
          </div>
        </motion.div>
      </Link>
    
    </main>

  );
}
