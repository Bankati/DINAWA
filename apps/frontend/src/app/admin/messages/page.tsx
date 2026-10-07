'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Mail, Phone, MapPin, Check, RotateCcw } from 'lucide-react';
import { adminApi, type AdminContactMessage } from '@/lib/admin';
import {
  PageHeader, Card, Badge, EmptyState, Skeleton, Button,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ds';
import { toast } from '@/components/ui';

const STATUS_LABELS: Record<string, string> = { NEW: 'Nouveau', HANDLED: 'Traité' };
const STATUS_TONE: Record<string, 'warning' | 'success'> = { NEW: 'warning', HANDLED: 'success' };

function fmtDate(s: string): string {
  return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function MessageCard({ m }: { m: AdminContactMessage }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const isLong = m.message.length > 240;
  const preview = isLong && !expanded ? `${m.message.slice(0, 240)}…` : m.message;

  async function toggleHandled() {
    setSaving(true);
    try {
      await adminApi.setContactMessageHandled(m.id, m.status === 'NEW');
      await queryClient.invalidateQueries({ queryKey: ['admin-contact-messages'] });
      toast.success(m.status === 'NEW' ? 'Message marqué comme traité' : 'Message remis en nouveau');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-foreground">{m.subject}</h3>
              <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABELS[m.status]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(m.createdAt)}</p>
          </div>
          <Button
            variant={m.status === 'NEW' ? 'secondary' : 'outline'}
            size="sm"
            loading={saving}
            onClick={toggleHandled}
          >
            {m.status === 'NEW'
              ? (<><Check className="w-3.5 h-3.5" />Marquer comme traité</>)
              : (<><RotateCcw className="w-3.5 h-3.5" />Remettre en nouveau</>)}
          </Button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{m.name}{m.role ? ` · ${m.role}` : ''}</span>
          <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 hover:text-primary">
            <Mail className="w-3.5 h-3.5" />{m.email}
          </a>
          {m.phone && (
            <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 hover:text-primary">
              <Phone className="w-3.5 h-3.5" />{m.phone}
            </a>
          )}
          {m.city && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />{m.city}
            </span>
          )}
        </div>

        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {preview}
          {isLong && (
            <button
              type="button"
              className="ml-2 text-primary font-semibold hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Réduire' : 'Lire la suite'}
            </button>
          )}
        </p>
      </div>
    </Card>
  );
}

export default function AdminMessagesPage() {
  const [status, setStatus] = useState('all');

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['admin-contact-messages', status],
    queryFn: () =>
      adminApi.listContactMessages({
        status: status === 'all' ? undefined : (status as 'NEW' | 'HANDLED'),
        limit: 100,
      }),
  });
  const messages = res?.data ?? [];
  const newCount = messages.filter((m) => m.status === 'NEW').length;

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Messages envoyés depuis le formulaire de contact public"
      />

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="NEW">Nouveaux</SelectItem>
            <SelectItem value="HANDLED">Traités</SelectItem>
          </SelectContent>
        </Select>
        {status === 'all' && newCount > 0 && (
          <Badge tone="warning">{newCount} nouveau{newCount > 1 ? 'x' : ''}</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
        </div>
      ) : isError ? (
        <Card>
          <EmptyState
            icon={<MessageSquare />}
            title="Impossible de charger les messages"
            description="Une erreur est survenue lors du chargement. Réessayez dans un instant."
          />
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageSquare />}
            title="Aucun message"
            description="Les messages envoyés depuis le formulaire de contact public apparaîtront ici."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => <MessageCard key={m.id} m={m} />)}
        </div>
      )}
    </div>
  );
}
