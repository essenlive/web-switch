'use client'

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Copy, KeyRound, TriangleAlert, UserPlus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCommunity } from '@/hooks/useCommunity';
import { exportKey, importKey } from '@/lib/nostr';
import { friendLink, keyLink } from '@/lib/links';

type Section = 'nickname' | 'friends' | 'backup';
const tray = 'flex flex-col gap-3 p-4 bg-background rounded-lg';

export default function Community() {
  const { nickname, following, myPubkey, friendCode, addFollowing, removeFollowing, saveNickname } = useCommunity();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [note, setNote] = useState<{ section: Section; text: string; error?: boolean } | null>(null);
  const [nsec, setNsec] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [restore, setRestore] = useState('');
  const [pendingImport, setPendingImport] = useState<string | null>(null); // key waiting for an explicit "Replace"

  const say = (section: Section, text: string, error = false) => setNote({ section, text, error });
  const renderNote = (section: Section) => (
    <p role="status" className={note?.error ? 'text-destructive font-bold' : 'font-bold'}>
      {note?.section === section ? note.text : ''}
    </p>
  );
  const copy = (text: string, section: Section, ok: string) =>
    navigator.clipboard.writeText(text).then(
      () => say(section, ok),
      () => say(section, 'Copy failed. Select the text and copy it by hand.', true),
    );

  // Identity link (#cle=nsec): the fragment is never sent to the server
  useEffect(() => {
    const m = location.hash.match(/^#cle=(nsec1\w+)/);
    if (!m) return;
    history.replaceState(null, '', location.pathname);
    setPendingImport(m[1]);
  }, []);

  // Friend link (?ami=…): wait for myPubkey, otherwise the self-add check is wrong
  const ami = searchParams.get('ami');
  useEffect(() => {
    if (!ami || !myPubkey) return;
    history.replaceState(null, '', location.pathname);
    const err = addFollowing(ami);
    say('friends', err ?? 'Friend added', !!err);
  }, [ami, myPubkey, addFollowing]);

  const showKey = async () => {
    const k = exportKey();
    if (!k) return;
    setNsec(k);
    setQr(await QRCode.toDataURL(keyLink(k)));
  };

  const hideKey = () => { setNsec(null); setQr(''); };

  const confirmImport = () => {
    if (pendingImport && importKey(pendingImport)) location.reload();
    else { setPendingImport(null); say('backup', 'That secret key is not valid', true); }
  };

  const nicknameHint = 'nickname-hint';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Community</h1>

      {pendingImport && (
        <section className={tray} role="alertdialog" aria-labelledby="replace-title">
          <h2 id="replace-title" className="text-xl font-bold flex items-center gap-2"><TriangleAlert aria-hidden /> Replace your identity?</h2>
          <p>This swaps your nickname, scores and friends for the identity of this key. If you have not backed up your current key, it is lost for good.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 grow" onClick={() => setPendingImport(null)}>Cancel</Button>
            <Button variant="destructive" className="h-11 grow" onClick={confirmImport}>Replace identity</Button>
          </div>
        </section>
      )}

      <form
        className={tray}
        onSubmit={e => {
          e.preventDefault();
          const err = saveNickname(draft);
          if (err) return say('nickname', err, true);
          say('nickname', 'Nickname saved');
          setDraft('');
        }}
      >
        <h2 className="text-xl font-bold flex items-center gap-2"><UserRound aria-hidden /> {nickname ? 'Your nickname' : 'Pick a nickname to join the leaderboard'}</h2>
        {!nickname && <p>Your scores show up under this name. No account needed.</p>}
        <Label htmlFor="nickname">{nickname ? `Current: ${nickname}. Change it` : 'Nickname'}</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input id="nickname" className="h-11" value={draft} aria-describedby={nicknameHint} aria-invalid={note?.section === 'nickname' && note.error} autoComplete="off" onChange={e => setDraft(e.target.value)} />
          <Button type="submit" className="h-11">Save</Button>
        </div>
        <p id={nicknameHint} className="text-sm text-muted-foreground">3 to 20 characters: letters, numbers, _ or -</p>
        {renderNote('nickname')}
      </form>

      {nickname && friendCode && (
        <section className={tray}>
          <h2 className="text-xl font-bold flex items-center gap-2"><UserPlus aria-hidden /> Your friend code</h2>
          <p>Send this to a friend so they can follow your scores.</p>
          <code className="break-all rounded-md bg-muted p-2 text-sm">{friendCode}</code>
          <Button className="h-11" onClick={() => copy(friendLink(friendCode), 'nickname', 'Friend link copied')}>
            <Copy /> Copy my friend link
          </Button>
        </section>
      )}

      {(nickname || following.length > 0) && (
        <form
          className={tray}
          onSubmit={e => {
            e.preventDefault();
            const err = addFollowing(friendInput);
            say('friends', err ?? 'Friend added', !!err);
            if (!err) setFriendInput('');
          }}
        >
          <h2 className="text-xl font-bold">Friends</h2>
          <Label htmlFor="friend">Add a friend with their code</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input id="friend" className="h-11" value={friendInput} placeholder="name:npub1…" autoComplete="off" aria-invalid={note?.section === 'friends' && note.error} onChange={e => setFriendInput(e.target.value)} />
            <Button type="submit" className="h-11">Add</Button>
          </div>
          {renderNote('friends')}
          {following.length > 0 && (
            <ul className="flex flex-col gap-2">
              {following.map(f => (
                <li key={f.pubkey} className="flex justify-between items-center gap-2">
                  <span className="min-w-0 truncate font-bold">{f.label}</span>
                  <Button type="button" variant="outline" className="h-11 shrink-0" aria-label={`Remove ${f.label}`} onClick={() => { removeFollowing(f.pubkey); say('friends', `Removed ${f.label}`); }}>Remove</Button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}

      {nickname && (
        <section className={tray}>
          <h2 className="text-xl font-bold flex items-center gap-2"><KeyRound aria-hidden /> Back up your identity</h2>
          <p>Your secret key is what proves your scores are yours. Lose it without a backup and the identity is gone.</p>
          <p className="flex gap-2 items-start text-sm"><TriangleAlert aria-hidden className="shrink-0 size-5" /> Anyone with this key or QR code can post as you. Treat it like a password.</p>
          {nsec ? (
            <>
              <code className="break-all rounded-md bg-muted p-2 text-sm">{nsec}</code>
              <Button className="h-11" onClick={() => copy(keyLink(nsec), 'backup', 'Transfer link copied')}><Copy /> Copy transfer link</Button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt="QR code to move your identity to another device" width={200} height={200} className="self-center bg-white p-2 rounded-md" />}
              <Button variant="outline" className="h-11" onClick={hideKey}>Hide key</Button>
            </>
          ) : <Button className="h-11" onClick={showKey}>Show my secret key</Button>}
          {renderNote('backup')}
        </section>
      )}

      <details className={tray}>
        <summary className="cursor-pointer text-xl font-bold rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Already have an identity? Restore it</summary>
        <form
          className="flex flex-col gap-3 pt-3"
          onSubmit={e => {
            e.preventDefault();
            if (!restore.trim().startsWith('nsec1')) return say('backup', 'That secret key is not valid', true);
            setPendingImport(restore.trim());
            setRestore('');
          }}
        >
          <Label htmlFor="restore">Secret key (starts with nsec1)</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input id="restore" className="h-11" type="password" value={restore} autoComplete="off" onChange={e => setRestore(e.target.value)} />
            <Button type="submit" className="h-11">Restore</Button>
          </div>
        </form>
      </details>
    </div>
  );
}
