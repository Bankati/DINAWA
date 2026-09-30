'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, Card, CardBody, Badge, Button, Skeleton } from '@/components/ds';

interface PlatformSettings {
  subscriptionQuotasSuspended: boolean;
  subscriptionBillingEnabled: boolean;
}

// Interrupteurs pilotés par le super-admin (voir /architect abonnements,
// 2026-09-30) — jamais une variable d'environnement Railway : c'est le
// client qui décide quoi activer sur la plateforme, pas le développeur.
export default function ParametresPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => api.get<PlatformSettings>('/admin/settings'),
  });
  const [savingKey, setSavingKey] = useState<keyof PlatformSettings | null>(null);
  const [error, setError] = useState('');

  async function toggle(key: keyof PlatformSettings, next: boolean) {
    setSavingKey(key);
    setError('');
    try {
      await api.patch('/admin/settings', { [key]: next });
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Réglages globaux de la plateforme WARAH" />

      {isLoading ? (
        <Card><CardBody><Skeleton className="h-24" /></CardBody></Card>
      ) : isError ? (
        <Card>
          <CardBody>
            <div className="text-sm text-red-600">
              Impossible de charger les réglages. Rechargez la page.
            </div>
          </CardBody>
        </Card>
      ) : settings ? (
        <div className="flex flex-col gap-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <SettingRow
            title="Suspendre les quotas de biens"
            description="Désactive le blocage par quota sur toute la plateforme — tout propriétaire ou gestionnaire peut ajouter des biens sans limite, quel que soit son forfait (Starter/Pro/Premium). Rien n'est supprimé, réactivable à tout moment."
            active={settings.subscriptionQuotasSuspended}
            saving={savingKey === 'subscriptionQuotasSuspended'}
            onToggle={() =>
              toggle('subscriptionQuotasSuspended', !settings.subscriptionQuotasSuspended)
            }
          />

          <SettingRow
            title="Facturation des abonnements"
            description="Active la facturation mensuelle automatique des forfaits Starter/Pro/Premium — une facture est générée le 1er de chaque mois, avec relances à J+3/J+7, puis suspension du compte (lecture seule) en cas d'impayé prolongé."
            active={settings.subscriptionBillingEnabled}
            saving={savingKey === 'subscriptionBillingEnabled'}
            onToggle={() =>
              toggle('subscriptionBillingEnabled', !settings.subscriptionBillingEnabled)
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function SettingRow({
  title,
  description,
  active,
  saving,
  onToggle,
}: {
  title: string;
  description: string;
  active: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h2 className="font-semibold text-sm text-foreground">{title}</h2>
              <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Actif' : 'Inactif'}</Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-lg">{description}</p>
          </div>
          <Button
            variant={active ? 'outline' : 'default'}
            size="sm"
            loading={saving}
            onClick={onToggle}
            className="shrink-0"
          >
            {active ? 'Désactiver' : 'Activer'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
