'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, ChevronDown, ShieldAlert, ShieldCheck, Info, Clock, Bot, Search } from 'lucide-react';
import { adminApi, type AdminAuditLogEntry } from '@/lib/admin';
import { describeAuditLog, entityCategoryLabel, CATEGORY_LABELS, type AuditTone } from '@/lib/audit-log-labels';
import {
  PageHeader, Card, CardBody, Badge, EmptyState, Skeleton, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ds';

const TONE_BADGE: Record<AuditTone, 'error' | 'warning' | 'success' | 'info' | 'neutral'> = {
  critical: 'error',
  warning: 'warning',
  success: 'success',
  info: 'info',
  routine: 'neutral',
  system: 'neutral',
};

const TONE_ICON: Record<AuditTone, typeof ShieldAlert> = {
  critical: ShieldAlert,
  warning: ShieldAlert,
  success: ShieldCheck,
  info: Info,
  routine: Clock,
  system: Bot,
};

type Period = 'all' | 'today' | '7d' | '30d';

function periodToRange(period: Period): { from?: string; to?: string } {
  if (period === 'all') return {};
  const now = new Date();
  const days = period === 'today' ? 0 : period === '7d' ? 7 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString() };
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminAuditLogsPage() {
  const [category, setCategory] = useState('all');
  const [period, setPeriod] = useState<Period>('7d');
  const [technicalSearch, setTechnicalSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const range = useMemo(() => periodToRange(period), [period]);

  const { data: res, isLoading: loading, isError } = useQuery({
    queryKey: ['admin-audit-logs', category, period, technicalSearch],
    queryFn: () =>
      adminApi.listAuditLogs({
        entityType: category === 'all' ? undefined : category,
        action: technicalSearch || undefined,
        from: range.from,
        to: range.to,
        limit: 100,
      }),
  });
  const logs = res?.data ?? [];

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        subtitle="Qui a fait quoi sur la plateforme, en langage clair — rien n'est jamais modifié ou supprimé de cet historique"
      />

      <div className="flex flex-wrap gap-2.5 mb-5">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Période" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Aujourd&apos;hui</SelectItem>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="all">Depuis le début</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative w-full sm:w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Recherche technique (ex : properties)"
            value={technicalSearch}
            onChange={(e) => setTechnicalSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
      ) : isError ? (
        <Card><CardBody><div className="text-sm text-red-600">Impossible de charger le journal d&apos;audit. Rechargez la page.</div></CardBody></Card>
      ) : logs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History />}
            title="Aucune entrée sur cette période"
            description="Essayez d'élargir la période ou de changer de catégorie."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {logs.map((entry) => (
            <AuditLogRow
              key={entry.id}
              entry={entry}
              isOpen={expanded.has(entry.id)}
              onToggle={() => toggle(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLogRow({
  entry, isOpen, onToggle,
}: {
  entry: AdminAuditLogEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { sentence, detail, tone } = describeAuditLog(entry);
  const ToneIcon = TONE_ICON[tone];

  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              tone === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                : tone === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : tone === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : tone === 'system' ? 'bg-gray-100 text-gray-500 dark:bg-ds-secondary dark:text-muted-foreground'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            }`}
          >
            <ToneIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <Badge tone={TONE_BADGE[tone]}>{entityCategoryLabel(entry)}</Badge>
              <span className="text-xs text-muted-foreground">{fmtDate(entry.createdAt)}</span>
            </div>
            <p className="text-sm text-foreground font-medium m-0">{sentence}</p>
            {detail && <p className="text-sm text-muted-foreground mt-1">{detail}</p>}

            <button
              type="button"
              onClick={onToggle}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 font-medium"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              Détails techniques
            </button>

            {isOpen && (
              <div className="mt-2.5 bg-ds-secondary rounded-lg p-3 text-xs flex flex-col gap-1.5">
                <div><span className="text-muted-foreground">Route :</span> <span className="font-mono">{entry.action}</span></div>
                <div><span className="text-muted-foreground">Type d&apos;entité :</span> {entry.entityType ?? '—'} {entry.entityId ? `(${entry.entityId})` : ''}</div>
                <div><span className="text-muted-foreground">Adresse IP :</span> {entry.ipAddress ?? '—'}</div>
                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Données envoyées :</span>
                    <pre className="mt-1 bg-background rounded-md p-2 overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
