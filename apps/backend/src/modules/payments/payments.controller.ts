import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Payment, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { MAX_DOCUMENT_BYTES } from '../../common/constants';
import { PaymentsService, PaginatedPayments } from './payments.service';
import { ReceiptPdfService } from '../receipts/receipt-pdf.service';
import { CreateManualPaymentDto } from './dto/create-manual-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly receiptPdf: ReceiptPdfService,
  ) {}

  @Post('manual')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Enregistre un paiement reçu hors plateforme (espèces, virement)',
    description:
      'Réservé à celui qui peut agir sur le bien (propriétaire sans mandat actif, ou ' +
      "gestionnaire mandaté). Crée directement un paiement PAID — pas d'étape de confirmation.",
  })
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  createManual(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateManualPaymentDto,
    @UploadedFile() proof?: Express.Multer.File,
  ): Promise<Payment> {
    return this.paymentsService.createManual(user, dto, proof);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.TENANT)
  @ApiOperation({ summary: 'Historique paginé des paiements, filtrable' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaginatedPayments> {
    return this.paymentsService.findAll(user, query);
  }

  @Post(':id/confirm')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Confirme une déclaration de paiement locataire — passe à PAID' })
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<Payment> {
    return this.paymentsService.confirm(user, id);
  }

  @Post(':id/reject')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Rejette une déclaration de paiement locataire — motif obligatoire' })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.reject(user, id, dto);
  }

  @Get(':id/receipt.pdf')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN, UserRole.TENANT)
  @ApiOperation({
    summary: 'Quittance PDF générée à la volée — jamais persistée',
    description: 'Disponible uniquement pour un paiement PAID.',
  })
  async downloadReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const payment = await this.paymentsService.generateReceiptTarget(user, id);
    const pdf = await this.receiptPdf.generate(payment);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quittance-${id}.pdf"`,
    });

    return new StreamableFile(pdf);
  }
}
