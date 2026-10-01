import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

// Sans ce filtre, une erreur Multer (dépassement de taille/nombre de
// fichiers sur un FileInterceptor/FilesInterceptor/FileFieldsInterceptor —
// 4 controllers concernés : profile, properties, payments,
// payment-declarations) remonte telle quelle au client : message brut en
// anglais ("File too large"), jamais traduit, jamais passé par
// ValidationPipe ni par aucun service — trouvé en conditions réelles,
// 2026-10-01 (voir /architect messages d'erreur en français). Un seul
// filtre global plutôt que quatre correctifs dispersés dans chaque
// controller.
const MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'Le fichier dépasse la taille maximale autorisée.',
  LIMIT_FILE_COUNT: 'Trop de fichiers envoyés en une seule fois.',
  LIMIT_UNEXPECTED_FILE: 'Champ de fichier inattendu ou type de fichier non pris en charge.',
  LIMIT_PART_COUNT: 'Requête multipart invalide — trop de parties.',
  LIMIT_FIELD_KEY: 'Nom de champ trop long.',
  LIMIT_FIELD_VALUE: 'Valeur de champ trop longue.',
  LIMIT_FIELD_COUNT: 'Trop de champs envoyés en une seule fois.',
};

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const message = MESSAGES[exception.code] ?? 'Fichier invalide.';

    response.status(400).json({
      statusCode: 400,
      message,
      error: 'Bad Request',
    });
  }
}
