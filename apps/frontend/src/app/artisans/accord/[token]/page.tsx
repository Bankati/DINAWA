'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import { Card, Button, Skeleton } from '@/components/ds';
import { TradeChips, formatDay } from '@/components/artisans/artisan-ui';
import { answerArtisanConsent, errorMessage, getArtisanConsent } from '@/lib/artisans';

// Page ouverte par l'artisan depuis le lien reçu sur WhatsApp : il accepte
// (ou refuse) d'apparaître dans l'annuaire public. Le lien ne sert qu'une fois.
export default function ArtisanConsentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [done, setDone] = useState<'PUBLIC' | 'REFUSED' | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['artisan-consent', token],
    queryFn: () => getArtisanConsent(token),
    retry: false,
  });

  const answer = useMutation({
    mutationFn: (decision: 'ACCEPT' | 'REFUSE') => answerArtisanConsent(token, decision, data?.notice.version ?? ''),
    onSuccess: (r) => setDone(r.directoryStatus === 'PUBLIC' ? 'PUBLIC' : 'REFUSED'),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 w-full max-w-xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-2xl font-extrabold text-foreground mb-4">Annuaire des artisans WARAH</h1>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : error || !data ? (
          <Card className="p-6">
            <p className="text-sm text-destructive">{errorMessage(error)}</p>
            <p className="text-sm text-muted-foreground mt-2">Demandez un nouveau lien à la personne qui vous l&apos;a envoyé.</p>
          </Card>
        ) : done ? (
          <Card className="p-6 flex flex-col items-center text-center gap-3">
            {done === 'PUBLIC' ? <CheckCircle2 className="w-12 h-12 text-green-600" /> : <XCircle className="w-12 h-12 text-muted-foreground" />}
            <p className="font-semibold">
              {done === 'PUBLIC' ? 'Merci ! Votre fiche est maintenant dans l’annuaire.' : 'C’est noté : votre fiche n’apparaîtra pas dans l’annuaire.'}
            </p>
            {done === 'PUBLIC' && <Button asChild><Link href="/artisans">Voir l&apos;annuaire</Link></Button>}
          </Card>
        ) : (
          <Card className="p-6 flex flex-col gap-4">
            <p className="text-sm">
              <strong>{data.invitedBy}</strong> vous a ajouté à son carnet d&apos;artisans sur WARAH et vous propose
              d&apos;apparaître dans l&apos;annuaire public, gratuitement, pour recevoir d&apos;autres clients.
            </p>
            <div className="rounded-lg bg-ds-secondary p-4 flex flex-col gap-2">
              <div className="font-bold">{data.displayName}</div>
              <div className="text-sm text-muted-foreground">Numéro : {data.phoneMasked}</div>
              <TradeChips trades={data.trades} />
              {data.zones.length > 0 && <div className="text-sm text-muted-foreground">Quartiers : {data.zones.join(', ')}</div>}
            </div>
            {data.directoryStatus === 'PUBLIC' ? (
              <p className="text-sm">Votre fiche est déjà dans l&apos;annuaire.</p>
            ) : (
              <>
                <p className="text-sm border-l-2 border-secondary pl-3">{data.notice.text}</p>
                {answer.isError && <p className="text-sm text-destructive">{errorMessage(answer.error)}</p>}
                <div className="flex gap-2 flex-wrap">
                  <Button size="lg" loading={answer.isPending && answer.variables === 'ACCEPT'} disabled={answer.isPending} onClick={() => answer.mutate('ACCEPT')}>
                    J&apos;accepte
                  </Button>
                  <Button size="lg" variant="outline" loading={answer.isPending && answer.variables === 'REFUSE'} disabled={answer.isPending} onClick={() => answer.mutate('REFUSE')}>
                    Non merci
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Lien valable jusqu&apos;au {formatDay(data.expiresAt)}, une seule fois.</p>
              </>
            )}
          </Card>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
