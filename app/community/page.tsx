'use client'

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { Copy, KeyRound, Trash2, TriangleAlert, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCommunity } from '@/hooks/useCommunity';
import { exportKey, importKey } from '@/lib/nostr';
import { keyLink } from '@/lib/links';

type Section = 'nickname' | 'friends' | 'backup' | 'danger';
const tray = 'flex flex-col gap-3 p-4 bg-background rounded-lg';

export default function Community() {
  const { nickname, following, highscores, addFollowing, removeFollowing, saveNickname, deleteProfile } = useCommunity();
  const [draft, setDraft] = useState('');
  useEffect(() => setDraft(nickname ?? ''), [nickname]); // the form starts on the current nickname
  const [friendInput, setFriendInput] = useState('');
  const [note, setNote] = useState<{ section: Section; text: string; error?: boolean } | null>(null);
  const [nsec, setNsec] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [restore, setRestore] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    <div className="flex flex-col gap-2">
      <h1 className="sr-only">Profile and community</h1>

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
        }}
      >
        <h2 className="text-xl font-bold flex items-center gap-2"><UserRound aria-hidden /> {nickname ? 'Your nickname' : 'Pick a nickname to join the leaderboard'}</h2>
        {!nickname && <p>Your scores show up under this name. No account needed.</p>}
        <Label htmlFor="nickname">{nickname ? 'Change your nickname' : 'Nickname'}</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input id="nickname" className="h-11" value={draft} aria-describedby={nicknameHint} aria-invalid={note?.section === 'nickname' && note.error} autoComplete="off" onChange={e => setDraft(e.target.value)} />
          {draft !== (nickname ?? '') && <Button type="submit" className="h-11">{nickname ? 'Update' : 'Save'}</Button>}
        </div>
        <p id={nicknameHint} className="text-sm text-muted-foreground">3 to 20 characters: letters, numbers, _ or -</p>
        {renderNote('nickname')}
      </form>

      <section className={tray}>
        <h2 className="text-xl font-bold">Your scores</h2>
        <p>Replay or remove your highscores on the <Link href="/leaderboard" className="underline font-bold">leaderboard page</Link>.</p>
      </section>

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

      {(nickname || highscores.length > 0) && (
        <section className={tray}>
          <h2 className="text-xl font-bold flex items-center gap-2"><Trash2 aria-hidden /> Delete my profile</h2>
          <p>Removes your nickname, friends and highscores from this device, and every score you published to the community. You get a new identity. This cannot be undone, back up your key first if you may want it back.</p>
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 grow" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" className="h-11 grow" disabled={deleting} onClick={async () => {
                setDeleting(true);
                await deleteProfile();
                setDeleting(false); setConfirmDelete(false); hideKey();
                say('nickname', 'Profile deleted. You have a fresh identity.');
              }}>{deleting ? 'Deleting…' : 'Yes, delete everything'}</Button>
            </div>
          ) : <Button variant="destructive" className="h-11" onClick={() => setConfirmDelete(true)}>Delete my profile</Button>}
          {renderNote('danger')}
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
