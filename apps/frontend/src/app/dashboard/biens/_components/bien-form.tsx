'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  propertiesApi,
  PROPERTY_TYPE_LABELS,
  type PropertyType,
  type PropertyPhoto,
} from '@/lib/properties';
import { ApiError } from '@/lib/api';
import { Dropdown } from '@/components/ui/dropdown';
import { FlowButton } from '@/components/ui/flow-button';
import './bien-form.css';

const VILLES = ['Lomé', 'Sokodé', 'Kara', 'Atakpamé', 'Kpalimé', 'Dapaong', 'Tsévié', 'Aného'];
const TYPE_OPTIONS = (Object.entries(PROPERTY_TYPE_LABELS) as [PropertyType, string][]).map(([value, label]) => ({ value, label }));
const VILLE_OPTIONS = VILLES.map((v) => ({ value: v, label: v }));

const STEPS = [
  { number: 1, title: 'Type' },
  { number: 2, title: 'Adresse' },
  { number: 3, title: 'Loyer' },
  { number: 4, title: 'Photos' },
];

interface FormState {
  type: PropertyType | '';
  description: string;
  neighborhood: string;
  city: string;
  address: string;
  surfaceArea: string;
  roomsCount: string;
  monthlyRent: string;
  monthlyCharges: string;
}

const EMPTY_FORM: FormState = {
  type: '',
  description: '',
  neighborhood: '',
  city: '',
  address: '',
  surfaceArea: '',
  roomsCount: '',
  monthlyRent: '',
  monthlyCharges: '',
};

export default function BienForm({ bienId }: { bienId?: string }) {
  const router = useRouter();
  const isEditMode = Boolean(bienId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<PropertyPhoto[]>([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (!bienId) return;
    setLoading(true);
    propertiesApi
      .getById(bienId)
      .then((bien) => {
        setForm({
          type: bien.type,
          description: bien.description ?? '',
          neighborhood: bien.neighborhood,
          city: bien.city,
          address: bien.address,
          surfaceArea: String(bien.surfaceArea),
          roomsCount: bien.roomsCount != null ? String(bien.roomsCount) : '',
          monthlyRent: String(bien.monthlyRent),
          monthlyCharges: String(bien.monthlyCharges),
        });
        setExistingPhotos(bien.photos);
      })
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors du chargement du bien');
      })
      .finally(() => setLoading(false));
  }, [bienId]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return form.type !== '';
      case 2:
        return form.neighborhood.trim() !== '' && form.city.trim() !== '';
      case 3:
        return Number(form.surfaceArea) >= 1 && Number(form.monthlyRent) >= 1;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (isStepValid(currentStep) && currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };
  const goPrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onPhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPhotoFiles((prev) => [...prev, ...files].slice(0, 10));
    e.target.value = '';
  };

  const removeSelectedPhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (photoId: string) => {
    if (!bienId || deletingPhotoId) return;
    setDeletingPhotoId(photoId);
    try {
      await propertiesApi.removePhoto(bienId, photoId);
      setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Erreur lors de la suppression de la photo');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid(1) || !isStepValid(2) || !isStepValid(3) || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    const dto = {
      type: form.type as PropertyType,
      address: form.address.trim() || `${form.neighborhood}, ${form.city}`,
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      surfaceArea: Number(form.surfaceArea),
      roomsCount: form.roomsCount ? Number(form.roomsCount) : undefined,
      monthlyRent: Number(form.monthlyRent),
      monthlyCharges: form.monthlyCharges ? Number(form.monthlyCharges) : 0,
      description: form.description.trim() || undefined,
    };

    try {
      const bien = isEditMode && bienId
        ? await propertiesApi.update(bienId, dto)
        : await propertiesApi.create(dto);

      if (photoFiles.length > 0) {
        await propertiesApi.addPhotos(bien.id, photoFiles).catch(() => {});
      }

      router.push(isEditMode ? `/dashboard/biens/${bien.id}` : '/dashboard/biens');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Une erreur est survenue');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bf-page">
        <div className="bf-skeleton" />
      </div>
    );
  }

  return (
    <div className="bf-page">
      <div className="bf-header">
        <div>
          <h1 className="bf-title">{isEditMode ? 'Modifier le bien' : 'Ajouter un bien'}</h1>
          <p className="bf-subtitle">
            {isEditMode ? 'Modifiez les informations du bien' : 'Remplissez les informations pour ajouter un nouveau bien'}
          </p>
        </div>
        <Link href="/dashboard/biens" className="bf-btn-secondary">Annuler</Link>
      </div>

      <div className="bf-stepper">
        {STEPS.map((step) => (
          <div key={step.number} className="bf-step-wrap">
            <div className={`bf-step-dot${currentStep >= step.number ? ' active' : ''}`}>
              {currentStep > step.number ? '✓' : step.number}
            </div>
            <span className="bf-step-label">{step.title}</span>
          </div>
        ))}
      </div>

      {errorMessage && <div className="bf-alert-error">{errorMessage}</div>}

      <form onSubmit={onSubmit} className="bf-form">
        {currentStep === 1 && (
          <div className="bf-card">
            <h2 className="bf-card-title">Type de bien</h2>
            <div className="bf-field">
              <label htmlFor="bf-type">Type de bien *</label>
              <Dropdown
                id="bf-type"
                value={form.type}
                onChange={(v) => { setField('type', v); markTouched('type'); }}
                options={TYPE_OPTIONS}
                placeholder="Sélectionnez un type"
              />
              {touched.type && form.type === '' && <p className="bf-field-error">Le type est requis</p>}
            </div>
            <div className="bf-field">
              <label htmlFor="bf-description">Description</label>
              <textarea
                id="bf-description"
                rows={4}
                placeholder="Décrivez votre bien (optionnel)…"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={2000}
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="bf-card">
            <h2 className="bf-card-title">Adresse</h2>
            <div className="bf-field">
              <label htmlFor="bf-neighborhood">Quartier *</label>
              <input
                id="bf-neighborhood"
                type="text"
                placeholder="Ex : Adewui, Bé, Tokoin…"
                value={form.neighborhood}
                onChange={(e) => setField('neighborhood', e.target.value)}
                onBlur={() => markTouched('neighborhood')}
                maxLength={200}
              />
              {touched.neighborhood && form.neighborhood.trim() === '' && <p className="bf-field-error">Le quartier est requis</p>}
            </div>
            <div className="bf-field">
              <label htmlFor="bf-city">Ville *</label>
              <Dropdown
                id="bf-city"
                value={form.city}
                onChange={(v) => { setField('city', v); markTouched('city'); }}
                options={VILLE_OPTIONS}
                placeholder="Sélectionnez une ville"
              />
              {touched.city && form.city.trim() === '' && <p className="bf-field-error">La ville est requise</p>}
            </div>
            <div className="bf-field">
              <label htmlFor="bf-address">Adresse complète</label>
              <input
                id="bf-address"
                type="text"
                placeholder="Ex : 12 Rue des Cocotiers, Lomé"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="bf-card">
            <h2 className="bf-card-title">Caractéristiques</h2>
            <div className="bf-field">
              <label htmlFor="bf-surface">Surface (m²) *</label>
              <input
                id="bf-surface"
                type="number"
                min={1}
                step="any"
                placeholder="Ex : 85"
                value={form.surfaceArea}
                onChange={(e) => setField('surfaceArea', e.target.value)}
                onBlur={() => markTouched('surfaceArea')}
              />
              {touched.surfaceArea && Number(form.surfaceArea) < 1 && <p className="bf-field-error">La surface est requise (min. 1 m²)</p>}
            </div>
            <div className="bf-field">
              <label htmlFor="bf-rooms">Nombre de pièces</label>
              <input id="bf-rooms" type="number" min={1} placeholder="Ex : 3" value={form.roomsCount} onChange={(e) => setField('roomsCount', e.target.value)} />
            </div>
            <div className="bf-field">
              <label htmlFor="bf-rent">Loyer mensuel (FCFA) *</label>
              <input
                id="bf-rent"
                type="number"
                min={1}
                placeholder="Ex : 100 000"
                value={form.monthlyRent}
                onChange={(e) => setField('monthlyRent', e.target.value)}
                onBlur={() => markTouched('monthlyRent')}
              />
              {touched.monthlyRent && Number(form.monthlyRent) < 1 && <p className="bf-field-error">Le loyer est requis</p>}
            </div>
            <div className="bf-field">
              <label htmlFor="bf-charges">Charges mensuelles (FCFA)</label>
              <input id="bf-charges" type="number" min={0} placeholder="Ex : 15 000" value={form.monthlyCharges} onChange={(e) => setField('monthlyCharges', e.target.value)} />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="bf-card">
            <h2 className="bf-card-title">Photos</h2>

            {existingPhotos.length > 0 && (
              <div className="bf-photos-existing">
                <p className="bf-photos-label">Photos actuelles</p>
                <div className="bf-photos-grid">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="bf-photo-thumb">
                      <img src={photo.url} alt="" />
                      <button
                        type="button"
                        className="bf-photo-remove"
                        disabled={deletingPhotoId === photo.id}
                        onClick={() => removeExistingPhoto(photo.id)}
                        aria-label="Supprimer cette photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="bf-photos-label">{isEditMode ? 'Ajouter de nouvelles photos' : 'Photos du bien'}</p>
            <label className="bf-upload-zone">
              <input type="file" accept="image/*" multiple onChange={onPhotosSelected} hidden />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span>Cliquez pour choisir des photos</span>
            </label>
            <p className="bf-photos-hint">JPG, PNG (max 5 Mo par photo, max 10 photos)</p>

            {photoFiles.length > 0 && (
              <div className="bf-photos-grid">
                {photoFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="bf-photo-thumb">
                    <img src={URL.createObjectURL(file)} alt="" />
                    <button type="button" className="bf-photo-remove" onClick={() => removeSelectedPhoto(i)} aria-label="Retirer cette photo">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bf-nav">
          <button type="button" className="bf-btn-secondary" onClick={goPrevious} disabled={currentStep === 1}>Précédent</button>
          {currentStep < STEPS.length ? (
            <button key="next" type="button" className="bf-btn-primary" onClick={goNext} disabled={!isStepValid(currentStep)}>Suivant</button>
          ) : (
            <FlowButton
              key="submit"
              type="submit"
              disabled={isSubmitting}
              text={isSubmitting ? 'Enregistrement…' : isEditMode ? 'Enregistrer les modifications' : 'Créer le bien'}
            />
          )}
        </div>
      </form>
    </div>
  );
}
