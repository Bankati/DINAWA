import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveResponsibleUserId } from '../../common/permissions/property-access';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { StorageService } from '../storage/storage.service';
import { NotifyService } from '../notify/notify.service';
import { CreatePaymentDeclarationDto } from './dto/create-payment-declaration.dto';
import { UpdatePaymentDeclarationDto } from './dto/update-payment-declaration.dto';

type DeclarationWithAccess = Prisma.PaymentGetPayload<{
  include: { declaration: true; lease: { include: { property: true } } };
}>;

// Flux distinct de la saisie manuelle (voir PaymentsService.createManual) —
// initié par le locataire, passe par PENDING_CONFIRMATION jusqu'à l'action
// du propriétaire/gestionnaire via PaymentsService.confirm()/reject() (voir
// build-plan.md unité 20).
@Injectable()
export class PaymentDeclarationsService {
  private readonly logger = new Logger(PaymentDeclarationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notify: NotifyService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreatePaymentDeclarationDto,
    proof?: Express.Multer.File,
  ): Promise<Payment> {
    const scheduleEntry = await this.prisma.paymentScheduleEntry.findUnique({
      where: { id: dto.scheduleEntryId },
      include: { lease: { include: { property: true } } },
    });
    if (!scheduleEntry) {
      throw new NotFoundException('Échéance introuvable');
    }
    if (user.role !== 'TENANT' || user.id !== scheduleEntry.lease.tenantUserId) {
      throw new ForbiddenException('Vous ne pouvez déclarer un paiement que sur votre propre bail');
    }

    let proofStoragePath: string | undefined;
    if (proof) {
      proofStoragePath = `${scheduleEntry.leaseId}/${randomUUID()}.${proof.mimetype.split('/')[1]}`;
      await this.storage.upload('payment-proofs', proofStoragePath, proof.buffer, proof.mimetype);
    }

    const declaredAt = new Date(dto.declaredAt);
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          scheduleEntryId: scheduleEntry.id,
          leaseId: scheduleEntry.leaseId,
          source: 'TENANT_DECLARATION',
          status: 'PENDING_CONFIRMATION',
          paymentMethod: dto.declaredMethod,
          paidAmount: dto.declaredAmount,
          paidAt: declaredAt,
          proofStoragePath,
          note: dto.note,
        },
      });

      await tx.paymentDeclaration.create({
        data: {
          paymentId: created.id,
          declaredAmount: dto.declaredAmount,
          declaredAt,
          declaredMethod: dto.declaredMethod,
          proofStoragePath,
          note: dto.note,
        },
      });

      return created;
    });

    try {
      const responsibleUserId = await resolveResponsibleUserId(
        this.prisma,
        scheduleEntry.lease.property,
      );
      await this.notify.notifyUser({
        userId: responsibleUserId,
        event: 'payment-declaration-pending',
        variables: {
          tenantName: `${user.firstName} ${user.lastName}`,
          propertyAddress: scheduleEntry.lease.property.address,
          amount: dto.declaredAmount,
        },
      });
    } catch (notifyError) {
      this.logger.error(
        `[payment-declarations] notification création échouée pour payment=${payment.id}`,
        notifyError,
      );
    }

    return payment;
  }

  async update(
    user: AuthenticatedUser,
    paymentId: string,
    dto: UpdatePaymentDeclarationDto,
    proof?: Express.Multer.File,
  ): Promise<Payment> {
    const payment = await this.loadOwnDeclaration(user, paymentId);
    const previousProofStoragePath = payment.proofStoragePath ?? undefined;

    const declaredAt = dto.declaredAt ? new Date(dto.declaredAt) : undefined;

    let proofStoragePath: string | undefined;
    if (proof) {
      proofStoragePath = `${payment.leaseId}/${randomUUID()}.${proof.mimetype.split('/')[1]}`;
      await this.storage.upload('payment-proofs', proofStoragePath, proof.buffer, proof.mimetype);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          ...(dto.declaredAmount !== undefined ? { paidAmount: dto.declaredAmount } : {}),
          ...(declaredAt ? { paidAt: declaredAt } : {}),
          ...(dto.declaredMethod ? { paymentMethod: dto.declaredMethod } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
          ...(proofStoragePath ? { proofStoragePath } : {}),
        },
      });

      await tx.paymentDeclaration.update({
        where: { paymentId },
        data: {
          ...(dto.declaredAmount !== undefined ? { declaredAmount: dto.declaredAmount } : {}),
          ...(declaredAt ? { declaredAt } : {}),
          ...(dto.declaredMethod ? { declaredMethod: dto.declaredMethod } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
          ...(proofStoragePath ? { proofStoragePath } : {}),
          editedAt: new Date(),
        },
      });

      return updatedPayment;
    });

    // Suppression de l'ancien justificatif seulement après que le nouveau
    // soit uploadé et la transaction confirmée — jamais l'inverse, même
    // principe que ProfileService.updateProfile() pour les remplacements.
    if (
      proofStoragePath &&
      previousProofStoragePath &&
      previousProofStoragePath !== proofStoragePath
    ) {
      await this.storage.remove('payment-proofs', previousProofStoragePath);
    }

    return updated;
  }

  async cancel(user: AuthenticatedUser, paymentId: string): Promise<{ message: string }> {
    await this.loadOwnDeclaration(user, paymentId);

    // PaymentDeclaration est supprimée en cascade (onDelete: Cascade côté
    // schéma) — l'échéance n'a jamais été modifiée par une déclaration
    // encore PENDING_CONFIRMATION, rien d'autre à défaire.
    await this.prisma.payment.delete({ where: { id: paymentId } });

    return { message: 'Déclaration annulée' };
  }

  private async loadOwnDeclaration(
    user: AuthenticatedUser,
    paymentId: string,
  ): Promise<DeclarationWithAccess> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { declaration: true, lease: { include: { property: true } } },
    });
    if (!payment || !payment.declaration) {
      throw new NotFoundException('Déclaration introuvable');
    }
    if (payment.lease.tenantUserId !== user.id) {
      throw new ForbiddenException('Accès refusé à cette déclaration');
    }
    if (payment.status !== 'PENDING_CONFIRMATION') {
      throw new ConflictException(
        'Cette déclaration a déjà été traitée — modification ou annulation impossible',
      );
    }
    return payment;
  }
}
