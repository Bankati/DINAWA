import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import {
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  SIGNED_URL_EXPIRY_SECONDS,
} from '../../common/constants';

export type StorageBucket =
  | 'property-photos'
  | 'property-documents'
  | 'id-documents'
  | 'manager-documents'
  | 'payment-proofs'
  | 'profile-photos';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MIME_TYPES = new Set<string>([...IMAGE_MIME_TYPES, 'application/pdf']);

const BUCKET_LIMITS: Record<StorageBucket, { maxBytes: number; allowedMimeTypes: Set<string> }> = {
  'property-photos': { maxBytes: MAX_PHOTO_BYTES, allowedMimeTypes: IMAGE_MIME_TYPES },
  'property-documents': { maxBytes: MAX_DOCUMENT_BYTES, allowedMimeTypes: DOCUMENT_MIME_TYPES },
  'id-documents': { maxBytes: MAX_PHOTO_BYTES, allowedMimeTypes: IMAGE_MIME_TYPES },
  'manager-documents': { maxBytes: MAX_DOCUMENT_BYTES, allowedMimeTypes: DOCUMENT_MIME_TYPES },
  'payment-proofs': { maxBytes: MAX_DOCUMENT_BYTES, allowedMimeTypes: DOCUMENT_MIME_TYPES },
  'profile-photos': { maxBytes: MAX_PHOTO_BYTES, allowedMimeTypes: IMAGE_MIME_TYPES },
};

// Seule source de vérité pour les types MIME autorisés par bucket — utilisé
// à la fois par StorageService.assertValid() (garde-fou final) et par
// createMimeTypeFilter() (rejet précoce côté Multer, voir /review unité 13 :
// jamais bufferiser un fichier en mémoire avant de valider son type).
export function isAllowedMimeType(bucket: StorageBucket, mimetype: string): boolean {
  return BUCKET_LIMITS[bucket].allowedMimeTypes.has(mimetype);
}

// Cache centralisé des URLs signées — évite N aller-retours réseau vers Supabase
// Storage (latence ~1-3s depuis Afrique/Togo vers serveurs US). TTL 55 min
// (les URLs signées expirent à 60 min par défaut).
interface CachedSignedUrl {
  url: string;
  expiresAt: number;
}
const URL_CACHE_TTL_MS = 55 * 60 * 1000;

// Wrapper Supabase Storage — seul point d'entrée pour manipuler les 6 buckets
// privés du projet (voir architecture.md, invariant Storage — mis à jour à
// l'étape 10 pour ajouter profile-photos). La compression image (sharp) est
// de la responsabilité de l'appelant (ex. PropertiesService.uploadPropertyPhoto)
// — ce service reste générique et ignore tout du contenu métier du fichier.
@Injectable()
export class StorageService {
  private readonly urlCache = new Map<string, CachedSignedUrl>();

  constructor(private readonly supabase: SupabaseAdminService) {}

  async upload(
    bucket: StorageBucket,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    this.assertValid(bucket, file, contentType);

    const { error } = await this.supabase.withRetry(() =>
      this.supabase.raw.storage.from(bucket).upload(path, file, { contentType, upsert: false }),
    );
    if (error) throw new InternalServerErrorException(`Upload ${bucket} échoué: ${error.message}`);
    return path;
  }

  async getSignedUrl(
    bucket: StorageBucket,
    path: string,
    expiresIn: number = SIGNED_URL_EXPIRY_SECONDS,
  ): Promise<string> {
    const cacheKey = `${bucket}:${path}`;
    const cached = this.urlCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.url;

    const { data, error } = await this.supabase.withRetry(() =>
      this.supabase.raw.storage.from(bucket).createSignedUrl(path, expiresIn),
    );
    if (error || !data) throw new InternalServerErrorException(`URL signée ${bucket} échouée`);
    this.urlCache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + URL_CACHE_TTL_MS });
    return data.signedUrl;
  }

  // Génère plusieurs URLs signées en un seul appel HTTP pour les chemins non cachés
  async getSignedUrls(
    bucket: StorageBucket,
    paths: string[],
    expiresIn: number = SIGNED_URL_EXPIRY_SECONDS,
  ): Promise<Map<string, string>> {
    if (paths.length === 0) return new Map();

    const now = Date.now();
    const result = new Map<string, string>();
    const uncached: string[] = [];

    for (const path of paths) {
      const cached = this.urlCache.get(`${bucket}:${path}`);
      if (cached && now < cached.expiresAt) {
        result.set(path, cached.url);
      } else {
        uncached.push(path);
      }
    }

    if (uncached.length > 0) {
      const { data, error } = await this.supabase.withRetry(() =>
        this.supabase.raw.storage.from(bucket).createSignedUrls(uncached, expiresIn),
      );
      if (!error && data) {
        for (const item of data) {
          if (item.signedUrl && item.path) {
            result.set(item.path, item.signedUrl);
            this.urlCache.set(`${bucket}:${item.path}`, {
              url: item.signedUrl,
              expiresAt: now + URL_CACHE_TTL_MS,
            });
          }
        }
      }
    }

    return result;
  }

  // Invalide le cache d'une URL (ex. après suppression d'un fichier)
  invalidateCachedUrl(bucket: StorageBucket, path: string): void {
    this.urlCache.delete(`${bucket}:${path}`);
  }

  // Budget réduit (1 seule tentative, 5s) — remove() est souvent appelé en
  // ligne dans une requête HTTP utilisateur (remplacement de photo/document,
  // nettoyage d'un ancien justificatif) pour une opération non bloquante
  // pour l'utilisateur ; le budget par défaut de withRetry() (jusqu'à
  // ~40-47s, pensé pour les crons) y ferait attendre la réponse trop
  // longtemps. Un fichier orphelin résiduel en cas d'échec est sans impact
  // fonctionnel (même risque que le fichier restait déjà avant ce wrapping).
  async remove(bucket: StorageBucket, path: string): Promise<void> {
    await this.supabase.withRetry(() => this.supabase.raw.storage.from(bucket).remove([path]), {
      retries: 0,
      timeoutMs: 5_000,
    });
  }

  private assertValid(bucket: StorageBucket, file: Buffer, contentType: string): void {
    const limits = BUCKET_LIMITS[bucket];
    if (!limits.allowedMimeTypes.has(contentType)) {
      throw new BadRequestException(`Type de fichier non autorisé pour ${bucket}: ${contentType}`);
    }
    if (file.byteLength > limits.maxBytes) {
      const maxMb = limits.maxBytes / (1024 * 1024);
      throw new BadRequestException(`Fichier trop volumineux pour ${bucket} (max ${maxMb} Mo)`);
    }
  }
}
