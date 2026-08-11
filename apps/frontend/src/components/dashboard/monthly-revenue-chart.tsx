'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fcfa, formatMoisCourt, formatMoisLong } from '@/lib/dashboard';

export interface MonthlyRevenueChartProps {
  data: { mois: string; montant: number }[];
  emptyMessage?: string;
}

// Barres janvier → décembre — même palette primaire que le reste du
// dashboard, remplace l'ancien tracé SVG fait main (Catmull-Rom).
export function MonthlyRevenueChart({ data, emptyMessage = 'Aucun revenu enregistré pour cette période.' }: MonthlyRevenueChartProps) {
  const hasData = data.some((d) => d.montant > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-gray-400 text-center px-6">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 3" vertical={false} stroke="#E5E7EB" />
        <XAxis
          dataKey="mois"
          tickFormatter={formatMoisCourt}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => (v === 0 ? '0' : `${Math.round(v / 1000)}k`)}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          formatter={(value) => [fcfa(Number(value) || 0), 'Revenus']}
          labelFormatter={(label) => formatMoisLong(String(label))}
          cursor={{ fill: 'rgba(15,76,129,0.06)' }}
          contentStyle={{ fontSize: 12.5, borderRadius: 8, border: '1px solid #E5E7EB' }}
        />
        <Bar dataKey="montant" fill="#0F4C81" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
