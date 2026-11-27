'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, MessageCircle, Phone, Search, Wrench } from 'lucide-react';
import PublicNavbar from '@/components/public-navbar';
import PublicFooter from '@/components/public-footer';
import {
  Card, Button, Input, EmptyState, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ds';
import { Stars, TradeChips, TradeSelect, VerifiedMark, formatDay } from '@/components/artisans/artisan-ui';
import {
  TRADE_LABELS, type ArtisanTrade,
  formatPhone, getPublicArtisan, getPublicArtisans, whatsappLink,
} from '@/lib/artisans';

const LIMIT = 20;
const CONTACT_TEXT = "Bonjour, j'ai trouvé votre numéro dans l'annuaire des artisans WARAH.";

// Annuaire public des artisans (unité 52) : seulement ceux qui ont eux-mêmes
// accepté d'y figurer.
export default function PublicArtisansPage() {
  const [trade, setTrade] = useState<ArtisanTrade | ''>('');
  const [zone, setZone] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['public-artisans', trade, zone, search, page],
    queryFn: () => getPublicArtisans({ trade, zone: zone || undefined, search: search || undefined, page, limit: LIMIT }),
  });
  const { data: detail } = useQuery({
    queryKey: ['public-artisan', selectedId],
    queryFn: () => getPublicArtisan(selectedId as string),
    enabled: selectedId !== null,
  });
  const artisans = data?.data ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">Annuaire des artisans</h1>
        <p className="text-muted-foreground mt-2 mb-6 max-w-2xl">
          Plombiers, électriciens, maçons… ajoutés par des propriétaires WARAH et notés après leurs interventions.
          Chaque artisan a accepté lui-même d&apos;apparaître ici.
        </p>

        <div className="flex gap-3 mb-6 flex-wrap">
          <TradeSelect value={trade} onChange={(v) => { setTrade(v); setPage(1); }} />
          <Input className="h-11 max-w-[220px]" placeholder="Quartier (ex. Tokoin)" value={zone}
            onChange={(e) => { setZone(e.target.value); setPage(1); }} aria-label="Quartier" />
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input className="pl-9 h-11" placeholder="Nom de l'artisan" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Nom de l'artisan" />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" />
          </div>
        ) : isError ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-destructive mb-3">L&apos;annuaire est momentanément indisponible.</p>
            <Button variant="outline" onClick={() => refetch()}>Réessayer</Button>
          </Card>
        ) : artisans.length === 0 ? (
          <Card>
            <EmptyState icon={<Wrench />} title="Aucun artisan trouvé"
              description="Essayez un autre métier ou un autre quartier. L'annuaire s'enrichit à chaque artisan qui accepte d'y figurer." />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {artisans.map((a) => (
                <Card key={a.id}>
                  <div className="p-5 flex flex-col gap-3 h-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-foreground">{a.displayName}</div>
                      {a.verified && <VerifiedMark />}
                    </div>
                    <TradeChips trades={a.trades} />
                    {a.zones.length > 0 && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{a.zones.join(', ')}</div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Stars value={a.ratingAverage} />
                      {a.ratingCount > 0 ? `${a.ratingAverage.toFixed(1)} (${a.ratingCount} avis)` : 'Pas encore d’avis'}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2 pt-2">
                      <Button size="sm" asChild>
                        <a href={whatsappLink(a.phone, CONTACT_TEXT)} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4" />WhatsApp</a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:+228${a.phone}`}><Phone className="w-4 h-4" />{formatPhone(a.phone)}</a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedId(a.id)}>Voir les avis</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</Button>
                <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Suivant</Button>
              </div>
            )}
          </>
        )}
      </main>
      <PublicFooter />

      <Dialog open={selectedId !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {!detail ? <Skeleton className="h-48" /> : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{detail.displayName}{detail.verified && <VerifiedMark />}</DialogTitle>
                <DialogDescription>{detail.trades.map((t) => TRADE_LABELS[t]).join(', ')}{detail.zones.length > 0 && ` · ${detail.zones.join(', ')}`}</DialogDescription>
              </DialogHeader>
              {detail.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">Pas encore d&apos;avis : ils sont laissés par les propriétaires après une intervention.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {detail.reviews.map((r) => (
                    <li key={r.id} className="border-b border-ds-border pb-3 last:border-0">
                      <div className="flex items-center gap-2 text-sm"><Stars value={r.rating} /><strong>{r.authorName}</strong></div>
                      <div className="text-xs text-muted-foreground">{formatDay(r.createdAt)}{r.trade && ` · ${TRADE_LABELS[r.trade]}`}</div>
                      {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
