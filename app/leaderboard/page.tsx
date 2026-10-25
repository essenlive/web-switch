'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Leaderboard } from '@/components/leaderboard';
import { Input } from '@/components/ui/input';
import { getDailyString } from '@/lib/utils';

const CS = '6x8';
const toDay = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`; // YYYYMMDD -> YYYY-MM-DD

export default function LeaderboardPage() {
  const [day, setDay] = useState(''); // rempli après montage : la date locale diffère entre serveur et client
  useEffect(() => setDay(toDay(getDailyString())), []);
  const seed = day.replaceAll('-', '');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 p-4 bg-background rounded-lg">
        <h2 className="text-2xl font-bold">Leaderboard</h2>
        <label className="flex items-center gap-2">
          Grille du jour
          <Input type="date" value={day} max={toDay(getDailyString())} onChange={e => e.target.value && setDay(e.target.value)} />
        </label>
        {seed && <Link href={`/g?s=${seed}&cs=${CS}`} className="underline font-bold">Jouer cette grille</Link>}
      </div>
      {seed && <Leaderboard url={`?s=${seed}&cs=${CS}`} />}
    </div>
  );
}
