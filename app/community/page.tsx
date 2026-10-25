'use client'

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCommunity } from '@/hooks/useCommunity';
import { exportKey, importKey } from '@/lib/nostr';
import { friendLink, keyLink } from '@/lib/links';

export default function Community() {
  const { nickname, following, myPubkey, friendCode, addFollowing, removeFollowing, saveNickname } = useCommunity();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [nsec, setNsec] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [restore, setRestore] = useState('');

  // Lien d'identité (#cle=nsec) : le fragment n'est jamais envoyé au serveur
  useEffect(() => {
    const m = location.hash.match(/^#cle=(nsec1\w+)/);
    if (!m) return;
    history.replaceState(null, '', location.pathname);
    if (confirm("Remplacer ton identité actuelle par celle de ce lien ?") && importKey(m[1])) location.reload();
  }, []);

  // Lien ami (?ami=…) : attendre myPubkey, sinon le contrôle d'auto-ajout est faux
  const ami = searchParams.get('ami');
  useEffect(() => {
    if (!ami || !myPubkey) return;
    history.replaceState(null, '', location.pathname);
    setMessage(addFollowing(ami) ?? 'Ami ajouté');
  }, [ami, myPubkey, addFollowing]);

  const showKey = async () => {
    const k = exportKey();
    if (!k) return;
    setNsec(k);
    setQr(await QRCode.toDataURL(keyLink(k)));
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-background rounded-lg">
      <h2 className="text-2xl font-bold">Communauté</h2>
      {message && <p role="status" className="font-bold">{message}</p>}

      <section className="flex flex-col gap-2">
        <h3 className="text-xl font-bold">Pseudo</h3>
        <div className="flex gap-2">
          <Input value={draft} placeholder={nickname ?? '3–20 caractères'} onChange={e => setDraft(e.target.value)} />
          <Button onClick={() => { setMessage(saveNickname(draft) ?? 'Pseudo enregistré'); setDraft(''); }}>Enregistrer</Button>
        </div>
        {friendCode && (
          <>
            <p>Ton code ami : <code className="break-all">{friendCode}</code></p>
            <Button onClick={() => navigator.clipboard.writeText(friendLink(friendCode)).then(() => setMessage('Lien ami copié'))}>
              Copier mon lien ami
            </Button>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xl font-bold">Amis</h3>
        <div className="flex gap-2">
          <Input value={friendInput} placeholder="pseudo:npub1…" onChange={e => setFriendInput(e.target.value)} />
          <Button onClick={() => { setMessage(addFollowing(friendInput) ?? 'Ami ajouté'); setFriendInput(''); }}>Ajouter</Button>
        </div>
        <ul>
          {following.map(f => (
            <li key={f.pubkey} className="flex justify-between items-center">
              {f.label}
              <Button variant="outline" onClick={() => removeFollowing(f.pubkey)}>Retirer</Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xl font-bold">Sauvegarde de l&apos;identité</h3>
        <p>Le lien ou le QR code équivaut à un mot de passe : ne le partage pas. Clé perdue sans sauvegarde = identité perdue.</p>
        {nsec ? (
          <>
            <code className="break-all">{nsec}</code>
            <Button onClick={() => navigator.clipboard.writeText(keyLink(nsec)).then(() => setMessage('Lien copié'))}>Copier le lien</Button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr && <img src={qr} alt="QR code pour transférer ton identité vers un autre appareil" width={200} height={200} />}
          </>
        ) : <Button onClick={showKey}>Afficher ma clé</Button>}
        <div className="flex gap-2">
          <Input value={restore} placeholder="nsec1…" onChange={e => setRestore(e.target.value)} />
          <Button onClick={() => {
            if (!confirm("L'import écrase ton identité actuelle. Continuer ?")) return;
            if (importKey(restore)) location.reload(); else setMessage('Clé invalide');
          }}>Restaurer</Button>
        </div>
      </section>
    </div>
  );
}
