'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, RefreshCw, Send } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from '@/components/ds';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  CLOSED_REASON_LABELS,
  DELIVERY_LABELS,
  type InboxMessage,
  KIND_LABELS,
  REPLY_MAX_LENGTH,
  THREAD_REFRESH_MS,
  closeThread,
  formatMessageTime,
  getThread,
  markThreadRead,
  remainingReplyTime,
  replyToThread,
  tenantName,
} from '@/lib/whatsapp-inbox';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

// Fil d'une conversation WhatsApp (unité 48). La lecture ne marque rien :
// le « lu » est envoyé explicitement une fois le fil affiché, et seulement
// par le responsable du bien (le serveur refuse les autres).
export function ConversationThread({ id, basePath }: { id: string; basePath: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['whatsapp-thread', id],
    queryFn: () => getThread(id),
    refetchInterval: THREAD_REFRESH_MS,
  });
  const [older, setOlder] = useState<InboxMessage[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null | undefined>(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef<string | null>(null);

  const conversation = data?.conversation;
  const messages = useMemo(() => {
    const seen = new Set<string>();
    return [...older, ...(data?.messages ?? [])].filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
  }, [older, data?.messages]);
  const lastId = messages.at(-1)?.id ?? null;
  const cursor = olderCursor === undefined ? (data?.nextCursor ?? null) : olderCursor;

  // Temps restant pour répondre, recalculé chaque minute.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);

  // « Lu » : une fois par nouveau dernier message, responsable seulement.
  useEffect(() => {
    if (!conversation?.unread || !conversation.canReply || !lastId || markedRef.current === lastId) return;
    markedRef.current = lastId;
    markThreadRead(id)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['whatsapp-unread'] });
        void queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      })
      .catch(() => {
        // Réessayé au prochain rafraîchissement ; le compteur reste juste.
        markedRef.current = null;
      });
  }, [conversation?.unread, conversation?.canReply, lastId, id, queryClient]);

  async function loadOlder() {
    if (!cursor) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const page = await getThread(id, cursor);
      setOlder((previous) => [...page.messages, ...previous]);
      setOlderCursor(page.nextCursor);
    } catch (error) {
      setOlderError(errorMessage(error, 'Impossible de charger les messages précédents.'));
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setSendError(null);
    try {
      await replyToThread(id, content);
      setText('');
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-thread', id] });
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    } catch (error) {
      setSendError(errorMessage(error, 'L’envoi a échoué. Réessayez dans quelques instants.'));
    } finally {
      setSending(false);
    }
  }

  async function close() {
    setClosing(true);
    setCloseError(null);
    try {
      await closeThread(id);
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-thread', id] });
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    } catch (error) {
      setCloseError(errorMessage(error, 'Impossible de terminer l’échange. Réessayez.'));
    } finally {
      setClosing(false);
    }
  }

  const backLink = (
    <Link
      href={basePath}
      className="inline-flex items-center gap-2 min-h-11 text-sm font-semibold text-primary hover:underline mb-3"
    >
      <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Toutes les conversations
    </Link>
  );

  if (isLoading) {
    return (
      <div>
        {backLink}
        <Card className="p-5 flex flex-col gap-3">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </Card>
      </div>
    );
  }

  if (isError || !conversation) {
    return (
      <div>
        {backLink}
        <Card>
          <EmptyState
            icon={<RefreshCw />}
            title="Conversation indisponible"
            description="Elle n’existe pas, vous n’y avez plus accès (changement de gestionnaire) ou la connexion a échoué."
            action={
              <Button size="lg" onClick={() => refetch()} loading={isFetching}>
                Réessayer
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const remaining = remainingReplyTime(conversation.replyWindowEndsAt, now);
  const tooLong = text.length > REPLY_MAX_LENGTH;

  return (
    <div>
      {backLink}
      <Card className="flex flex-col">
        <header className="flex items-start justify-between gap-3 flex-wrap px-5 py-4 border-b border-ds-border">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{tenantName(conversation)}</h1>
            <p className="text-sm text-muted-foreground truncate">{conversation.property.label}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={conversation.isOpen ? 'success' : 'neutral'}>
              {conversation.isOpen ? 'Échange en cours' : 'Échange terminé'}
            </Badge>
            {conversation.isOpen && conversation.canReply && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="lg" loading={closing}>
                    Terminer l’échange
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Terminer l’échange ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le robot WARAH reprend la main : les prochains messages du locataire n’arriveront plus ici,
                      jusqu’à ce qu’il choisisse de nouveau « Mon gestionnaire ». L’historique reste visible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void close()}>Terminer l’échange</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </header>

        {closeError && (
          <p role="alert" className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {closeError}
          </p>
        )}

        <div className="px-5 py-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto" aria-live="polite">
          {cursor && (
            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost" size="lg" onClick={() => void loadOlder()} loading={loadingOlder}>
                Voir les messages précédents
              </Button>
              {olderError && (
                <p role="alert" className="text-sm text-red-700">
                  {olderError}
                </p>
              )}
            </div>
          )}
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun message dans cette conversation.</p>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {!conversation.isOpen && conversation.closedReason && (
            <p className="text-xs text-muted-foreground text-center py-2">
              {CLOSED_REASON_LABELS[conversation.closedReason]}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <footer className="border-t border-ds-border px-5 py-4">
          {!conversation.canReply ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Eye className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              {conversation.readOnlyReason === 'LEASE_ENDED'
                ? 'Ce locataire n’a plus de bail en cours dans ce logement : la conversation reste consultable, mais vous ne pouvez plus lui écrire.'
                : 'Ce bien est confié à un gestionnaire : vous pouvez lire les échanges, c’est lui qui répond au locataire.'}
            </p>
          ) : !remaining ? (
            <p className="text-sm text-muted-foreground">
              Le locataire doit d’abord vous réécrire sur WhatsApp : vous ne pouvez répondre que dans les 24 h qui
              suivent son dernier message.
            </p>
          ) : (
            <form onSubmit={(event) => void send(event)} className="flex flex-col gap-2">
              <label htmlFor="whatsapp-reply" className="text-sm font-semibold text-foreground">
                Votre réponse <span className="font-normal text-muted-foreground">(vous pouvez encore répondre pendant {remaining})</span>
              </label>
              <textarea
                id="whatsapp-reply"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-ds-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Écrivez votre message au locataire…"
                aria-describedby="whatsapp-reply-help"
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span
                  id="whatsapp-reply-help"
                  className={cn('text-xs', tooLong ? 'text-red-700 font-semibold' : 'text-muted-foreground')}
                >
                  {text.length} / {REPLY_MAX_LENGTH} caractères — votre nom est ajouté automatiquement
                </span>
                <Button type="submit" size="lg" loading={sending} disabled={!text.trim() || tooLong}>
                  <Send className="w-4 h-4" aria-hidden="true" /> Envoyer
                </Button>
              </div>
              {sendError && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {sendError}
                </p>
              )}
            </form>
          )}
        </footer>
      </Card>
    </div>
  );
}

function MessageBubble({ message }: { message: InboxMessage }) {
  const fromAgency = message.from === 'AGENCY';
  const content = message.kind === 'text' ? message.text : KIND_LABELS[message.kind];
  return (
    <div className={cn('flex flex-col max-w-[85%]', fromAgency ? 'self-end items-end' : 'self-start items-start')}>
      <div
        className={cn(
          'rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words',
          fromAgency ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-foreground',
          message.kind !== 'text' && 'italic',
        )}
      >
        {content}
      </div>
      <span className="text-xs text-muted-foreground mt-1">
        {formatMessageTime(message.createdAt)}
        {fromAgency && message.delivery && ` · ${DELIVERY_LABELS[message.delivery]}`}
      </span>
    </div>
  );
}
