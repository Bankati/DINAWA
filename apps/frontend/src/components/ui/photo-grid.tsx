'use client';

import { cn } from '@/lib/cn';

export interface PhotoGridItem {
  id: string;
  url: string;
}

export interface PhotoThumbnailGridProps {
  photos: PhotoGridItem[];
  onRemove: (id: string) => void;
  emptyLabel?: string;
}

// Grille de vignettes réutilisable — utilisée à la fois pour les photos déjà
// persistées (édition d'un bien, suppression = appel API immédiat) et pour
// les fichiers pas encore envoyés (création, suppression = simple retrait
// local avant soumission). Le composant ne connaît pas la différence : il
// reçoit juste une liste { id, url } et un callback onRemove.
export function PhotoThumbnailGrid({ photos, onRemove, emptyLabel = 'Aucune photo pour l’instant.' }: PhotoThumbnailGridProps) {
  if (photos.length === 0) {
    return <div className="text-center py-6 text-gray-400 text-sm">{emptyLabel}</div>;
  }

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative rounded-xl overflow-hidden bg-gray-100 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
          style={{ aspectRatio: '1' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçus locaux (blob:) ou URLs signées Supabase temporaires, next/image ajouterait peu ici */}
          <img src={photo.url} alt="" className="w-full h-full object-cover block" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
          <button
            type="button"
            onClick={() => onRemove(photo.id)}
            aria-label="Retirer cette photo"
            className="absolute top-1.5 right-1.5 flex items-center justify-center w-6.5 h-6.5 rounded-full bg-black/55 text-white border-none cursor-pointer transition-all duration-150 hover:bg-red-600 hover:scale-110 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export interface PhotoUploadZoneProps {
  onSelect: (files: File[]) => void;
  disabled?: boolean;
  label: string;
  multiple?: boolean;
}

// Zone de dépôt en pointillé, cohérente avec la palette de marque (bleu
// primaire) plutôt que le gris neutre générique — remplace les <input
// type="file"> bruts précédemment utilisés.
export function PhotoUploadZone({ onSelect, disabled, label, multiple = true }: PhotoUploadZoneProps) {
  return (
    <label
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-sm font-semibold transition-colors duration-150',
        disabled
          ? 'cursor-not-allowed border-gray-200 text-gray-400 bg-gray-50'
          : 'cursor-pointer border-primary-200 text-primary bg-primary-50 hover:border-primary hover:bg-primary-100',
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        disabled={disabled}
        onChange={(e) => {
          // Snapshot immédiat en tableau simple — `e.target.files` est une
          // FileList *vivante* : la remettre à zéro juste après (ligne
          // suivante) viderait aussi toute référence gardée vers elle,
          // y compris dans un updater de setState différé par React.
          const selected = Array.from(e.target.files ?? []);
          e.target.value = '';
          onSelect(selected);
        }}
      />
    </label>
  );
}
