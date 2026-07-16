import { Controller, Get, HttpCode, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IdentityVerification } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MAX_PHOTO_BYTES } from '../../common/constants';
import { IdentityService, IdentityVerificationFiles } from './identity.service';

@ApiTags('Identity')
@ApiBearerAuth()
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('verify')
  @HttpCode(202)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Déclenche une vérification automatique de la CNI togolaise (OCR)',
    description:
      'Upload du recto (`image`) ET du verso (`imageBack`) de la CNI, tous deux requis ' +
      '(JPG/PNG/WebP, max 5 Mo chacun). Renvoie immédiatement la ligne en statut PENDING — ' +
      "l'OCR tourne en arrière-plan, entièrement automatique, aucune validation humaine. La " +
      'décision VERIFIED/REJECTED est basée uniquement sur le recto ; le verso enrichit la ' +
      "ligne (contact d'urgence, signal MRZ) sans jamais bloquer la décision. Interroger " +
      'GET /identity/status pour le résultat (quelques secondes).',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'imageBack', maxCount: 1 },
      ],
      { limits: { fileSize: MAX_PHOTO_BYTES } },
    ),
  )
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files: IdentityVerificationFiles = {},
  ): Promise<IdentityVerification> {
    return this.identityService.verify(user, files);
  }

  @Get('status')
  @ApiOperation({ summary: 'Dernier résultat de vérification CNI pour le compte courant' })
  async status(@CurrentUser() user: AuthenticatedUser): Promise<IdentityVerification | null> {
    return this.identityService.getLatestStatus(user.id);
  }
}
