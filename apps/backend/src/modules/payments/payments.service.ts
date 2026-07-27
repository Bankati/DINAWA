import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment, Prisma, ScheduleEntryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  canActOnProperty,
  propertyVisibilityWhere,
} from '../../common/permissions/property-access';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { StorageService } from '../storage/storage.service';
import { NotifyService } from '../notify/notify.service';
import { CreateManualPaymentDto } from './dto/create-manual-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { PAYMENT_CONFIRMED } from './payment.events';

export type PaymentWithAccess = Prisma.PaymentGetPayload<{
  include: {
    scheduleEntry: true;
    lease: { include: { property: true; owner: true; tenant: true } };
  };
}>;

export type PaginatedPayments = { data: Payment[]; page: number; limit: number; total: number };

// Recalcule le statut d'une échéance à partir des montants — jamais dérivé
// ailleurs (voir build-plan.md unité 16 : "dérivé en temps réel"). OVERDUE
// reste hors périmètre ici : posé uniquement par le cron de l'unité 25
// (non construite), jamais par un paiement.
function computeEntryStatus(paidAmount: number, expectedAmount: number): ScheduleEntryStatus {
  if (paidAmount <= 0) return 'PENDING';
  if (paidAmount >= expectedAmount) return 'PAID';
  return 'PARTIAL';
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notify: NotifyService,
    private readonly events: EventEmitter2,
  ) {}

  // Voir build-plan.md unité 19 — attestation directe par celui qui peut
  // agir sur le bien, jamais de passage par PENDING_CONFIRMATION (à
  // l'inverse de la déclaration locataire, voir PaymentDeclarationsService).
  async createManual(
    user: AuthenticatedUser,
    dto: CreateManualPaymentDto,
    proof?: Express.Multer.File,
  ): Promise<Payment> {
    const scheduleEntry = await this.prisma.paymentScheduleEntry.findUnique({
      where: { id: dto.scheduleEntryId },
      include: { lease: { include: { property: true } } },
    });
    if (!scheduleEntry) {
      throw new NotFoundException('Échéance introuvable');
    }

    const access = await canActOnProperty(this.prisma, user, scheduleEntry.lease.property);
    if (!access.canMutate) {
      throw new ForbiddenException("Vous n'avez pas les droits pour enregistrer ce paiement");
    }

    let proofStoragePath: string | undefined;
    if (proof) {
      proofStoragePath = `${scheduleEntry.leaseId}/${randomUUID()}.${proof.mimetype.split('/')[1]}`;
      await this.storage.upload('payment-proofs', proofStoragePath, proof.buffer, proof.mimetype);
    }

    const paidAmount = scheduleEntry.paidAmount + dto.paidAmount;
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          scheduleEntryId: scheduleEntry.id,
          leaseId: scheduleEntry.leaseId,
          source: 'MANUAL_OWNER',
          status: 'PAID',
          paymentMethod: dto.paymentMethod,
          paidAmount: dto.paidAmount,
          paidAt: new Date(dto.paidAt),
          proofStoragePath,
          note: dto.note,
          recordedByUserId: user.id,
        },
      });

      await tx.paymentScheduleEntry.update({
        where: { id: scheduleEntry.id },
        data: { paidAmount, status: computeEntryStatus(paidAmount, scheduleEntry.expectedAmount) },
      });

      return created;
    });

    this.events.emit(PAYMENT_CONFIRMED, { paymentId: payment.id });

    return payment;
  }

  async findAll(user: AuthenticatedUser, query: ListPaymentsQueryDto): Promise<PaginatedPayments> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PaymentWhereInput = {
      lease: {
        property: propertyVisibilityWhere(user),
        ...(query.propertyId ? { propertyId: query.propertyId } : {}),
        ...(query.tenantUserId ? { tenantUserId: query.tenantUserId } : {}),
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.from || query.to
        ? {
            paidAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, page, limit, total };
  }

  // Réservé au propriétaire/gestionnaire mandaté — confirme une déclaration
  // locataire (voir build-plan.md unité 20). Jamais applicable à un paiement
  // saisi manuellement (déjà PAID à la création) ni à un paiement Cashpay
  // (auto-confirmé par le webhook, unité 18 — non construite mais la garde
  // reste en place par anticipation, voir invariants architecture.md #4).
  async confirm(user: AuthenticatedUser, paymentId: string): Promise<Payment> {
    const payment = await this.loadPaymentWithAccess(user, paymentId, { requireMutate: true });
    this.assertConfirmable(payment);

    const paidAmount = payment.scheduleEntry.paidAmount + payment.paidAmount;
    const updated = await this.prisma.$transaction(async (tx) => {
      const confirmed = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'PAID', confirmedByUserId: user.id, confirmedAt: new Date() },
      });

      await tx.paymentScheduleEntry.update({
        where: { id: payment.scheduleEntryId },
        data: {
          paidAmount,
          status: computeEntryStatus(paidAmount, payment.scheduleEntry.expectedAmount),
        },
      });

      return confirmed;
    });

    this.events.emit(PAYMENT_CONFIRMED, { paymentId: updated.id });

    return updated;
  }

  async reject(
    user: AuthenticatedUser,
    paymentId: string,
    dto: RejectPaymentDto,
  ): Promise<Payment> {
    const payment = await this.loadPaymentWithAccess(user, paymentId, { requireMutate: true });
    this.assertConfirmable(payment);

    const rejected = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REJECTED', rejectionReason: dto.rejectionReason },
    });

    try {
      await this.notify.notifyUser({
        userId: payment.lease.tenantUserId,
        event: 'payment-rejected',
        variables: {
          propertyAddress: payment.lease.property.address,
          amount: payment.paidAmount,
          rejectionReason: dto.rejectionReason,
        },
      });
    } catch (notifyError) {
      // Une notification manquée ne doit jamais faire échouer le rejet
      // lui-même — même réflexe que AuthService.inviteTenant().
      void notifyError;
    }

    return rejected;
  }

  async generateReceiptTarget(
    user: AuthenticatedUser,
    paymentId: string,
  ): Promise<PaymentWithAccess> {
    const payment = await this.loadPaymentWithAccess(user, paymentId, { requireMutate: false });

    if (payment.status !== 'PAID') {
      throw new ConflictException('Aucune quittance disponible — paiement non confirmé');
    }

    return payment;
  }

  private async loadPaymentWithAccess(
    user: AuthenticatedUser,
    paymentId: string,
    options: { requireMutate: boolean },
  ): Promise<PaymentWithAccess> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        scheduleEntry: true,
        lease: { include: { property: true, owner: true, tenant: true } },
      },
    });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    if (user.role === 'TENANT' && user.id === payment.lease.tenantUserId) {
      if (options.requireMutate) {
        throw new ForbiddenException('Accès refusé à ce paiement');
      }
      return payment;
    }

    const access = await canActOnProperty(this.prisma, user, payment.lease.property);
    const allowed = options.requireMutate ? access.canMutate : access.canRead;
    if (!allowed) {
      throw new ForbiddenException('Accès refusé à ce paiement');
    }

    return payment;
  }

  private assertConfirmable(payment: PaymentWithAccess): void {
    if (payment.source === 'CASHPAY_API') {
      throw new ForbiddenException(
        'Un paiement Cashpay ne peut être confirmé ou rejeté manuellement',
      );
    }
    if (payment.status !== 'PENDING_CONFIRMATION') {
      throw new ConflictException("Ce paiement n'est pas en attente de confirmation");
    }
  }
}
