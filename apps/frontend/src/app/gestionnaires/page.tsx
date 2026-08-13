'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MapPin, Search, Users as UsersIcon, Mail, Copy, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { getPublicManagers, getPublicManagerById } from '@/lib/managers-public';
import {
  PageHeader, Card, Badge, Button, Input, Textarea, EmptyState, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ds';

const LIMIT = 12;
const TYPE_LABELS: Record<string, string> = { VILLA: 'Villa', APARTMENT: 'Appartement', STUDIO: 'Studio', COMMERCIAL: 'Commercial' };

interface HeroSlide { tag: string; title: string; subtitle: string; photo: string; objectPosition: string; }

// Avantages à confier ses biens à un gestionnaire — argumentaire marketing
// validé par le développeur (2026-08-12), inspiré d'une maquette de
// référence. Photos fournies par le développeur dans public/. Les photos
// sont très verticales (portrait buste) recadrées dans un cadre large — un
// centrage par défaut coupait les visages, d'où objectPosition ajusté vers
// le haut par photo plutôt qu'un centrage uniforme.
const HERO_SLIDES: HeroSlide[] = [
  {
    tag: 'Gain de temps',
    title: 'Libérez-vous de la gestion quotidienne',
    subtitle: "Un gestionnaire professionnel s'occupe de la recherche de locataires, des relances de loyers et du suivi des biens — vous gardez le contrôle sans y consacrer vos journées.",
    photo: '/african-man-black-suit-big-tv-screen-guy-shows-presentation.jpg',
    objectPosition: 'center 10%',
  },
  {
    tag: 'Expertise locale',
    title: 'Un professionnel qui connaît le marché',
    subtitle: 'Fixation du bon loyer, sélection rigoureuse des locataires, suivi des paiements : bénéficiez du savoir-faire d\'un gestionnaire expérimenté sur votre secteur.',
    photo: '/confident-entrepreneur-looking-camera-with-arms-folded-smiling.jpg',
    objectPosition: 'center 18%',
  },
  {
    tag: 'Confiance & transparence',
    title: 'Choisissez en toute confiance',
    subtitle: "Consultez les avis authentiques laissés par d'autres propriétaires avant de confier la gestion de vos biens à un gestionnaire.",
    photo: '/happy-african-american-businesswoman-working-touchpad-office.jpg',
    objectPosition: 'center 8%',
  },
];

function GestionnairesHero() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const indexRef = useRef(0);

  function goTo(i: number) {
    if (i === indexRef.current) return;
    setFade(false);
    setTimeout(() => { indexRef.current = i; setIndex(i); setFade(true); }, 200);
  }

  useEffect(() => {
    const timer = setInterval(() => goTo((indexRef.current + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[index];

  return (
    <div className="relative overflow-hidden rounded-2xl mb-6 h-[360px] md:h-[440px]">
      {HERO_SLIDES.map((s, i) => (
        <Image
          key={s.photo}
          src={s.photo}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          style={{ objectPosition: s.objectPosition }}
          className={cn('object-cover transition-opacity duration-300', i === index ? 'opacity-100' : 'opacity-0')}
        />
      ))}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(8,20,42,0.92) 0%, rgba(10,38,80,0.78) 55%, rgba(10,38,80,0.3) 100%)' }} />
      <div className={cn('relative z-10 h-full flex flex-col justify-center gap-3.5 px-7 md:px-12 max-w-xl transition-opacity duration-200', fade ? 'opacity-100' : 'opacity-0')}>
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary">
          <span className="w-6 h-[2px] bg-secondary" />{slide.tag}
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight m-0">{slide.title}</h1>
        <p className="text-sm md:text-[15px] text-white/80 leading-relaxed m-0">{slide.subtitle}</p>
      </div>
      <div className="absolute bottom-5 left-7 md:left-12 z-10 flex gap-2">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.photo}
            type="button"
            aria-label={`Diapositive ${i + 1}`}
            className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-secondary' : 'w-1.5 bg-white/40 hover:bg-white/60')}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}

interface MyReview { id: string; rating: number; comment: string | null; }
interface MandateLite { manager: { id: string }; acceptedAt: string | null }

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size} className={i <= Math.round(value) ? 'fill-secondary text-secondary' : 'text-gray-300'} />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} étoile${i > 1 ? 's' : ''}`} className="cursor-pointer">
          <Star width={24} height={24} className={i <= value ? 'fill-secondary text-secondary' : 'text-gray-300'} />
        </button>
      ))}
    </span>
  );
}

export default function GestionnairesPage() {
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['public-managers', search, minRating, page],
    queryFn: () => getPublicManagers({ page, limit: LIMIT, search: search || undefined, minRating: minRating ? +minRating : undefined }),
  });
  const managers = data?.data ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div>
      <GestionnairesHero />

      <PageHeader
        title="Annuaire des gestionnaires"
        subtitle="Trouvez un gestionnaire immobilier et consultez les avis d'autres propriétaires"
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Rechercher par nom…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={minRating || 'all'} onValueChange={(v) => { setMinRating(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[190px]"><SelectValue placeholder="Note minimale" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les notes</SelectItem>
            <SelectItem value="4">4 étoiles et plus</SelectItem>
            <SelectItem value="3">3 étoiles et plus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" />
        </div>
      ) : managers.length === 0 ? (
        <Card><EmptyState icon={<UsersIcon />} title="Aucun gestionnaire trouvé" description="Essayez une autre recherche ou un autre filtre." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {managers.map((m) => (
              <Card key={m.id}>
                <div className="p-5 flex flex-col gap-3">
                  <div>
                    <div className="font-bold text-foreground">{m.firstName} {m.lastName}</div>
                    {m.city && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{m.city}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars value={m.ratingAverage} />
                    <span className="text-xs text-muted-foreground">{m.ratingAverage.toFixed(1)} ({m.ratingCount} avis)</span>
                  </div>
                  {m.zonesOfIntervention.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {m.zonesOfIntervention.slice(0, 3).map((z) => <Badge key={z} tone="neutral">{z}</Badge>)}
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setSelectedId(m.id)}>Voir le profil</Button>
                </div>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Précédent</Button>
              <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suivant</Button>
            </div>
          )}
        </>
      )}

      <ManagerProfileDialog managerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function ManagerProfileDialog({ managerId, onClose }: { managerId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const { data: detail, isLoading } = useQuery({
    queryKey: ['public-managers', 'detail', managerId],
    queryFn: () => getPublicManagerById(managerId as string),
    enabled: !!managerId,
  });

  // Un avis n'est autorisé que si le propriétaire a (ou a eu) un mandat
  // accepté avec ce gestionnaire — même règle que ManagerReviewsService#create
  // côté backend, vérifiée ici uniquement pour l'affichage du formulaire.
  const { data: mandates } = useQuery({
    queryKey: ['mandates'],
    queryFn: () => api.get<MandateLite[]>('/mandates'),
    enabled: isOwner,
  });
  const eligible = isOwner && !!managerId && (mandates ?? []).some((m) => m.manager.id === managerId && m.acceptedAt);

  const { data: myReview } = useQuery({
    queryKey: ['managers', managerId, 'reviews', 'me'],
    queryFn: () => api.get<MyReview | null>(`/managers/${managerId}/reviews/me`),
    enabled: eligible,
  });

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  }

  // Pré-remplit le formulaire dès qu'on sait qu'un avis existe déjà — bascule
  // silencieusement sur PATCH plutôt que de retenter un POST qui échouerait.
  const prefillKey = myReview?.id ?? null;
  const [lastPrefillKey, setLastPrefillKey] = useState<string | null>(null);
  if (myReview && prefillKey !== lastPrefillKey) {
    setLastPrefillKey(prefillKey);
    setRating(myReview.rating);
    setComment(myReview.comment ?? '');
  }

  const reviewMutation = useMutation({
    mutationFn: () => {
      const payload = { rating, ...(comment.trim() ? { comment: comment.trim() } : {}) };
      return myReview
        ? api.patch(`/managers/${managerId}/reviews/${myReview.id}`, payload)
        : api.post(`/managers/${managerId}/reviews`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-managers'] });
      queryClient.invalidateQueries({ queryKey: ['managers', managerId, 'reviews', 'me'] });
    },
  });

  function handleClose(open: boolean) {
    if (!open) {
      setRating(0); setComment(''); setLastPrefillKey(null);
      reviewMutation.reset();
      onClose();
    }
  }

  return (
    <Dialog open={!!managerId} onOpenChange={handleClose}>
      <DialogContent maxWidth={560}>
        {isLoading || !detail ? (
          <div className="p-4"><Skeleton className="h-40" /></div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{detail.firstName} {detail.lastName}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Stars value={detail.ratingAverage} />
                <span className="text-sm text-muted-foreground">{detail.ratingAverage.toFixed(1)} ({detail.ratingCount} avis)</span>
              </div>
              {detail.email && (
                <div className="flex items-center gap-2 bg-ds-secondary rounded-lg px-3.5 py-2.5">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground flex-1 truncate">{detail.email}</span>
                  <Button
                    type="button"
                    variant={emailCopied ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => copyEmail(detail.email as string)}
                  >
                    {emailCopied ? <><Check className="w-3.5 h-3.5" />Copié</> : <><Copy className="w-3.5 h-3.5" />Copier</>}
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground m-0 -mt-2">C&apos;est cet email qui permet de déléguer un bien à ce gestionnaire.</p>
              {detail.city && <div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{detail.city}</div>}
              {detail.zonesOfIntervention.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {detail.zonesOfIntervention.map((z) => <Badge key={z} tone="info">{z}</Badge>)}
                </div>
              )}
              {detail.pricingNote && <p className="text-sm text-foreground bg-ds-secondary rounded-lg px-3.5 py-2.5 m-0">{detail.pricingNote}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-ds-border p-3">
                  <div className="text-xs text-muted-foreground">Biens gérés</div>
                  <div className="text-lg font-bold text-foreground">{detail.portfolio.totalManagedProperties}</div>
                </div>
                <div className="rounded-lg border border-ds-border p-3">
                  <div className="text-xs text-muted-foreground">Membre depuis</div>
                  <div className="text-sm font-semibold text-foreground">{new Date(detail.memberSince).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div>
                </div>
              </div>

              {detail.portfolio.byType.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {detail.portfolio.byType.map((t) => (
                    <Badge key={t.type} tone="neutral">{TYPE_LABELS[t.type] ?? t.type} · {t.count}</Badge>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">Avis ({detail.reviews.length})</h3>
                {detail.reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun avis pour le moment.</p>
                ) : (
                  <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
                    {detail.reviews.map((r) => (
                      <div key={r.id} className="border-b border-ds-border pb-3 last:border-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{r.ownerName}</span>
                          <Stars value={r.rating} size={12} />
                        </div>
                        {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {eligible && (
                <div className="border-t border-ds-border pt-4">
                  <h3 className="text-sm font-bold text-foreground mb-2">{myReview ? 'Modifier votre avis' : 'Laisser un avis'}</h3>
                  <StarPicker value={rating} onChange={setRating} />
                  <Textarea
                    className="mt-3"
                    rows={3}
                    placeholder="Votre expérience avec ce gestionnaire (optionnel)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  {reviewMutation.isError && (
                    <p className="text-sm text-destructive mt-2">
                      {reviewMutation.error instanceof ApiError ? reviewMutation.error.message : "Erreur lors de l'envoi de l'avis"}
                    </p>
                  )}
                  {reviewMutation.isSuccess && <p className="text-sm text-emerald-600 mt-2">Avis enregistré — merci pour votre retour.</p>}
                  <Button
                    className="mt-3"
                    size="sm"
                    disabled={rating === 0}
                    loading={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate()}
                  >
                    {myReview ? 'Mettre à jour l’avis' : 'Publier l’avis'}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
