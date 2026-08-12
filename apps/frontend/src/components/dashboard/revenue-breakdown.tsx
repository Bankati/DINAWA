'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fcfa, formatMoisCourt, formatMoisLong, type RevenuMensuel } from '@/lib/dashboard';

export interface RevenueBreakdownProps {
  /** Toujours 12 entrées Jan→Déc pour l'année sélectionnée (voir dashboard.service.ts#bucketByMonth). */
  data: RevenuMensuel[];
  emptyMessage?: string;
}

// Jetons de marque WARAH en valeurs brutes — recharts attend une chaîne de
// couleur directement (fill="var(--x)" n'est pas fiable pour un attribut de
// présentation SVG), donc on bascule manuellement selon le thème actif
// plutôt que de dépendre d'une variable CSS ici.
const COLORS = {
  light: { bar: '#0F4C81', grid: '#E5E7EB', tick: '#6B7280', cursor: 'rgba(15,76,129,0.06)' },
  dark: { bar: '#1B6FB8', grid: '#24365A', tick: '#9CA3AF', cursor: 'rgba(27,111,184,0.12)' },
};
const ACCENT = '#C9982E';

// Style "coloré" validé (2026-08-11, réf. maquette fournie par le
// développeur) — barres verticales, dernier mois actif mis en évidence en
// or plutôt qu'une comparaison à une valeur inventée.
export function RevenueBreakdown({ data, emptyMessage = 'Aucun revenu enregistré pour cette période.' }: RevenueBreakdownProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const c = mounted && resolvedTheme === 'dark' ? COLORS.dark : COLORS.light;

  const hasData = data.some((d) => d.montant > 0);
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground text-center px-6">
        {emptyMessage}
      </div>
    );
  }

  let lastActiveIndex = -1;
  data.forEach((d, i) => { if (d.montant > 0 || d.paiements > 0) lastActiveIndex = i; });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 3" vertical={false} stroke={c.grid} />
        <XAxis
          dataKey="mois"
          tickFormatter={formatMoisCourt}
          tick={{ fontSize: 11, fill: c.tick }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => (v === 0 ? '0' : `${Math.round(v / 1000)}k`)}
          tick={{ fontSize: 11, fill: c.tick }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: c.cursor }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div
                style={{
                  background: '#0A2650', color: 'white', borderRadius: 10, padding: '8px 12px',
                  fontSize: 12.5, fontWeight: 600, boxShadow: '0 8px 24px rgba(10,38,80,0.3)',
                }}
              >
                <div style={{ opacity: 0.65, fontSize: 11, marginBottom: 2, textTransform: 'capitalize' }}>{formatMoisLong(String(label))}</div>
                <div>{fcfa(Number(payload[0].value) || 0)}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="montant" radius={[6, 6, 0, 0]} maxBarSize={34}>
          {data.map((d, i) => (
            <Cell key={d.mois} fill={i === lastActiveIndex ? ACCENT : c.bar} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
