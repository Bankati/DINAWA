import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { StorageBucket, isAllowedMimeType } from './storage.service';

// Rejette un type MIME non autorisé avant que Multer ne bufferise le
// fichier en mémoire — jamais après (voir code-standards.md : « valider le
// Content-Type avant de lire le body complet »). Sans ça, un lot de
// plusieurs fichiers peut bufferiser des dizaines de Mo avant qu'un seul
// octet ne soit validé (voir /review unité 13). Un rejet ici fait échouer
// toute la requête multipart — aucun des fichiers du lot n'atteint jamais
// le service, donc aucune écriture partielle n'est possible non plus.
export function createMimeTypeFilter(bucket: StorageBucket): MulterOptions['fileFilter'] {
  return (_req, file, callback) => {
    if (!isAllowedMimeType(bucket, file.mimetype)) {
      callback(
        new BadRequestException(`Type de fichier non autorisé pour ${bucket}: ${file.mimetype}`),
        false,
      );
      return;
    }
    callback(null, true);
  };
}
