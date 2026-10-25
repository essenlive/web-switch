'use client'

import type React from "react";
import Link from "next/link";
import { Sunrise, CircleArrowRight, Timer, Dices, SlidersHorizontal } from "lucide-react";
import { getDailyString } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getRandomString } from "@/lib/utils";

export default function Home() {
    // Add random string to useEffect to avoid hydration errrors
    const [randomString, setRandomString] = useState("");
    useEffect(()=>{
      setRandomString(getRandomString());
    },[])
  
  return (
    <main className="flex flex-col w-full gap-2">
      <Link
        className="group rise-in flex flex-col rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ "--i": 0 } as React.CSSProperties}
        href={{
          pathname: '/g',
          query: { 
            s: getDailyString(),
            cs: '6x8'
          },
        }} >
        <div className="flex flex-col p-4 bg-background rounded-lg cursor-pointer transition-[transform,background-color] duration-150 ease-out hover:bg-accent active:scale-[0.985] active:bg-accent motion-reduce:transition-none"> 
          <div className="pb-3">

            <Sunrise size={32} />
          </div>
          <h2 className="text-2xl font-bold">
            Daily Mode
          </h2>
        <p className="text-xl mt-2 mb-4">
            Get a grid that changes everyday. Practice and try to solve the grid with as little moves as possible to improve your high score.  
          </p>
        <div className="flex justify-between items-center">
            <span className="text-xl font-bold">
                Play daily grid
            </span>
            <CircleArrowRight className="transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none" />
          </div>
          </div>
      </Link>

      <Link
        className="group rise-in flex flex-col rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ "--i": 1 } as React.CSSProperties}
        href={{
          pathname: '/r',
          query: {
            s: randomString,
            cs: '6x8'
          },
        }} >
        <div className="flex flex-col p-4 bg-background rounded-lg cursor-pointer transition-[transform,background-color] duration-150 ease-out hover:bg-accent active:scale-[0.985] active:bg-accent motion-reduce:transition-none"> 
          <div className="pb-3">

            <Dices size={32} />
          </div>
          <h2 className="text-2xl font-bold ">
            Random Mode
          </h2>
          <p className="text-xl mt-2 mb-4">
            Get a random grid everytime, train yourself to spot the best switches in all the different scenarios. 
          </p>
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold">
              Play random grid
            </span>
            <CircleArrowRight className="transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none" />
          </div >
        </div>
      </Link>
      
      <Link
        className="group rise-in flex flex-col rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ "--i": 2 } as React.CSSProperties}
        href={{
          pathname: '/g',
          query: {
            s: getDailyString(),
            cs: '6x8',
            t: 'true'
          },
        }} >
        <div className="flex flex-col p-4 bg-background rounded-lg cursor-pointer transition-[transform,background-color] duration-150 ease-out hover:bg-accent active:scale-[0.985] active:bg-accent motion-reduce:transition-none">

          <div className="pb-3">

            <Timer size={32} />
          </div>
          <h2 className="text-2xl font-bold ">
            Time challenge Mode
          </h2>
          <p className="text-xl mt-2 mb-4">
            The daily grid grows a line every few moves. Clear it before it outgrows you.
          </p>
          <div className="flex justify-between items-center">
            <span className="font-bold text-xl">
              Play time challenge grid
            </span>
            <CircleArrowRight className="transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none" />
          </div>
        </div>
      </Link>
      <Link className="group rise-in flex flex-col rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ "--i": 3 } as React.CSSProperties} href="/custom">
        <div className="flex flex-col p-4 bg-background rounded-lg cursor-pointer transition-[transform,background-color] duration-150 ease-out hover:bg-accent active:scale-[0.985] active:bg-accent motion-reduce:transition-none">
          <div className="pb-3">
            <SlidersHorizontal size={32} />
          </div>
          <h2 className="text-2xl font-bold ">
            Custom Mode
          </h2>
          <p className="text-xl mt-2 mb-4">
            Pick the size, the seed and the rules, then get a link to share your grid.
          </p>
          <div className="flex justify-between items-center">
            <span className="font-bold text-xl">
              Create a custom grid
            </span>
            <CircleArrowRight className="transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none" />
          </div>
        </div>
      </Link>
    
    </main>

  );
}
