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

// Wrapper Supabase Storage — seul point d'entrée pour manipuler les 6 buckets
// privés du projet (voir architecture.md, invariant Storage — mis à jour à
// l'étape 10 pour ajouter profile-photos). La compression image (sharp) est
// de la responsabilité de l'appelant (ex. PropertiesService.uploadPropertyPhoto)
// — ce service reste générique et ignore tout du contenu métier du fichier.
@Injectable()
export class StorageService {
  constructor(private readonly supabase: SupabaseAdminService) {}

  async upload(
    bucket: StorageBucket,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    this.assertValid(bucket, file, contentType);

    const { error } = await this.supabase.raw.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: false });
    if (error) throw new InternalServerErrorException(`Upload ${bucket} échoué: ${error.message}`);
    return path;
  }

  async getSignedUrl(
    bucket: StorageBucket,
    path: string,
    expiresIn: number = SIGNED_URL_EXPIRY_SECONDS,
  ): Promise<string> {
    const { data, error } = await this.supabase.raw.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data) throw new InternalServerErrorException(`URL signée ${bucket} échouée`);
    return data.signedUrl;
  }

  async remove(bucket: StorageBucket, path: string): Promise<void> {
    await this.supabase.raw.storage.from(bucket).remove([path]);
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
