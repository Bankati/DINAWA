'use client';

import { Select } from '@/components/ui';

const MOIS_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export interface DashboardFiltersValue {
  mois: number;
  annee: number;
}

export interface DashboardFiltersProps {
  value: DashboardFiltersValue;
  onChange: (value: DashboardFiltersValue) => void;
  yearsBack?: number;
}

// Les deux seuls filtres du dashboard (demande explicite) — mois pilote les
// KPI du mois sélectionné, année pilote le graphique janvier→décembre.
export function DashboardFilters({ value, onChange, yearsBack = 4 }: DashboardFiltersProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: yearsBack }, (_, i) => currentYear - i);

  return (
    <div className="flex gap-2">
      <div style={{ width: 150 }}>
        <Select
          aria-label="Mois"
          value={value.mois}
          onChange={(e) => onChange({ ...value, mois: Number(e.target.value) })}
          className="py-2"
        >
          {MOIS_LABELS.map((label, i) => (
            <option key={label} value={i + 1}>{label}</option>
          ))}
        </Select>
      </div>
      <div style={{ width: 100 }}>
        <Select
          aria-label="Année"
          value={value.annee}
          onChange={(e) => onChange({ ...value, annee: Number(e.target.value) })}
          className="py-2"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
