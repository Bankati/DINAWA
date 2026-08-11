'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fcfa, PROPERTY_TYPE_LABELS, type RepartitionType } from '@/lib/dashboard';

const DONUT_COLORS = ['#0F4C81', '#C9982E', '#059669', '#7C3AED'];

export interface RentTypeDonutProps {
  data: RepartitionType[];
  emptyMessage?: string;
}

// Donut « répartition des loyers par type de bien » — même palette que les
// icônes bi-villa/bi-apartment/bi-commercial déjà utilisées ailleurs dans le
// dashboard (voir dashboard/page.css), pour rester cohérent visuellement.
export function RentTypeDonut({ data, emptyMessage = 'Aucun loyer à répartir pour l’instant.' }: RentTypeDonutProps) {
  const filtered = data.filter((d) => d.montant > 0);
  const total = filtered.reduce((s, d) => s + d.montant, 0);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-gray-400 text-center px-6">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total loyers</span>
        <div className="text-sm font-bold text-primary-dark">{fcfa(total)}</div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="montant"
            nameKey="type"
            innerRadius={58}
            outerRadius={86}
            paddingAngle={2}
            strokeWidth={2}
            stroke="#fff"
          >
            {filtered.map((entry, i) => (
              <Cell key={entry.type} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const type = String((item as { payload?: { type?: string } })?.payload?.type ?? '');
              return [fcfa(Number(value) || 0), PROPERTY_TYPE_LABELS[type] ?? type];
            }}
            contentStyle={{ fontSize: 12.5, borderRadius: 8, border: '1px solid #E5E7EB' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span style={{ fontSize: 12, color: '#374151' }}>{PROPERTY_TYPE_LABELS[value] ?? value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
