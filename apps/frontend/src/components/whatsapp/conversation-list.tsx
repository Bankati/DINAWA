'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ds';
import { cn } from '@/lib/cn';
import {
  type ConversationFilter,
  THREAD_REFRESH_MS,
  formatMessageTime,
  listConversations,
  messagePreview,
  tenantName,
} from '@/lib/whatsapp-inbox';

const FILTERS: { value: ConversationFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'open', label: 'En cours' },
  { value: 'closed', label: 'Terminées' },
];

// Liste des conversations WhatsApp (unité 48), commune au propriétaire et
// au gestionnaire : basePath = /dashboard/messages ou /gestionnaire/messages.
export function ConversationList({ basePath }: { basePath: string }) {
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['whatsapp-conversations', filter, page],
    queryFn: () => listConversations(filter, page),
    refetchInterval: THREAD_REFRESH_MS,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Les messages WhatsApp de vos locataires. Vous pouvez leur répondre pendant 24 h après leur dernier message."
      />

      <div className="flex gap-2 mb-4 flex-wrap" role="group" aria-label="Filtrer les conversations">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => {
              setFilter(item.value);
              setPage(1);
            }}
            className={cn(
              'min-h-11 px-4 rounded-lg text-sm font-semibold transition-colors',
              filter === item.value ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-5 flex flex-col gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<RefreshCw />}
            title="Impossible de charger les messages"
            description="Vérifiez votre connexion puis réessayez."
            action={
              <Button size="lg" onClick={() => refetch()} loading={isFetching}>
                Réessayer
              </Button>
            }
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={<MessageSquare />}
            title="Aucun message"
            description="Quand un locataire choisira « Mon gestionnaire » dans le menu WhatsApp de WARAH, ses messages arriveront ici."
          />
        ) : (
          <ul className="divide-y divide-ds-border">
            {data.data.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`${basePath}/${conversation.id}`}
                  className="flex items-start gap-3 px-5 py-4 min-h-16 hover:bg-ds-secondary transition-colors"
                >
                  <span
                    className={cn('mt-2 h-2.5 w-2.5 rounded-full shrink-0', conversation.unread ? 'bg-primary' : 'bg-transparent')}
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-3">
                      <span className={cn('truncate text-foreground', conversation.unread ? 'font-bold' : 'font-semibold')}>
                        {tenantName(conversation)}
                        {conversation.unread && <span className="sr-only"> (non lu)</span>}
                      </span>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatMessageTime(conversation.lastMessageAt)}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">{conversation.property.label}</span>
                    <span className="flex items-center justify-between gap-3 mt-1">
                      <span className="text-sm text-muted-foreground truncate">
                        {messagePreview(conversation.lastMessage)}
                      </span>
                      <Badge tone={conversation.isOpen ? 'success' : 'neutral'}>
                        {conversation.isOpen ? 'En cours' : 'Terminée'}
                      </Badge>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="outline" size="lg" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédentes
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </span>
          <Button variant="outline" size="lg" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Suivantes
          </Button>
        </div>
      )}
    </div>
  );
}
