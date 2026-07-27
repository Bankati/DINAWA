import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Payment, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MAX_DOCUMENT_BYTES } from '../../common/constants';
import { PaymentDeclarationsService } from './payment-declarations.service';
import { CreatePaymentDeclarationDto } from './dto/create-payment-declaration.dto';
import { UpdatePaymentDeclarationDto } from './dto/update-payment-declaration.dto';

@ApiTags('Payment Declarations')
@ApiBearerAuth()
@Controller('payment-declarations')
@Roles(UserRole.TENANT)
export class PaymentDeclarationsController {
  constructor(private readonly declarationsService: PaymentDeclarationsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Déclare avoir payé une échéance — passe en attente de confirmation',
    description:
      'Réservé au locataire connecté, sur son propre bail. Justificatif (`proof`) optionnel.',
  })
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentDeclarationDto,
    @UploadedFile() proof?: Express.Multer.File,
  ): Promise<Payment> {
    return this.declarationsService.create(user, dto, proof);
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Modifie une déclaration tant qu’elle est en attente de confirmation',
    description: 'Justificatif (`proof`) optionnel — remplace le précédent si fourni.',
  })
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDeclarationDto,
    @UploadedFile() proof?: Express.Multer.File,
  ): Promise<Payment> {
    return this.declarationsService.update(user, id, dto, proof);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Annule une déclaration tant qu’elle est en attente de confirmation',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.declarationsService.cancel(user, id);
  }
}
