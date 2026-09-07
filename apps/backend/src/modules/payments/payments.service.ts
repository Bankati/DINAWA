import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PAYMENT_CONFIRMED } from './payment.events';
import { PaydunyaService, PaydunyaInvoiceStatus, PaydunyaError } from './paydunya.service';
import { PAYDUNYA_ABANDON_AFTER_MS } from '../../common/constants';

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
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notify: NotifyService,
    private readonly events: EventEmitter2,
    private readonly paydunya: PaydunyaService,
    private readonly config: ConfigService,
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

  // Initie un paiement PayDunya (voir build-plan.md unité 17, adaptée à
  // PayDunya — /architect 2026-09-07). Réservé au locataire, sur son propre
  // bail uniquement (même garde que PaymentDeclarationsService.create()).
  // Le montant n'est jamais saisi par le client — toujours le solde restant
  // calculé côté serveur, pour ne jamais permettre un paiement partiel via ce
  // canal (contrairement à la saisie manuelle propriétaire/gestionnaire).
  async initiate(
    user: AuthenticatedUser,
    dto: InitiatePaymentDto,
  ): Promise<{ paymentId: string; checkoutUrl: string }> {
    const scheduleEntry = await this.prisma.paymentScheduleEntry.findUnique({
      where: { id: dto.scheduleEntryId },
      include: { lease: { include: { property: true } } },
    });
    if (!scheduleEntry) {
      throw new NotFoundException('Échéance introuvable');
    }
    if (user.role !== 'TENANT' || user.id !== scheduleEntry.lease.tenantUserId) {
      throw new ForbiddenException('Vous ne pouvez payer que votre propre bail');
    }

    const remaining = scheduleEntry.expectedAmount - scheduleEntry.paidAmount;
    if (remaining <= 0) {
      throw new ConflictException('Cette échéance est déjà réglée');
    }

    const payment = await this.prisma.payment.create({
      data: {
        scheduleEntryId: scheduleEntry.id,
        leaseId: scheduleEntry.leaseId,
        source: 'PAYDUNYA_API',
        status: 'PENDING',
        paymentMethod: dto.paymentMethod,
        paidAmount: remaining,
      },
    });

    const apiBaseUrl = this.config.getOrThrow<string>('API_BASE_URL');
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');

    try {
      const invoice = await this.paydunya.createInvoice({
        amount: remaining,
        description: `WARAH — ${scheduleEntry.lease.property.address}`,
        paymentId: payment.id,
        callbackUrl: `${apiBaseUrl}/payments/webhooks/paydunya?paymentId=${payment.id}`,
        returnUrl: `${frontendUrl}/locataire/paiements/historique?paydunya=success`,
        cancelUrl: `${frontendUrl}/locataire/paiements/historique?paydunya=cancelled`,
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { transactionId: invoice.token },
      });

      return { paymentId: payment.id, checkoutUrl: invoice.checkoutUrl };
    } catch (error) {
      // La facture Payment reste PENDING sans transactionId — invisible pour
      // le cron de réconciliation (qui exige transactionId non-null, voir
      // reconcilePaydunyaPayment()), donc sans effet de bord si le locataire
      // réessaie juste après (nouvel appel initiate() = nouveau Payment).
      this.logger.error(`[paydunya/initiate] échec pour payment=${payment.id}`, error);
      const message =
        error instanceof PaydunyaError
          ? error.message
          : 'Le service de paiement est momentanément indisponible, réessayez dans quelques instants';
      throw new ServiceUnavailableException(message);
    }
  }

  async findAll(user: AuthenticatedUser, query: ListPaymentsQueryDto): Promise<PaginatedPayments> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Recherche par nom/email de locataire — n'a de sens que pour un
    // propriétaire/gestionnaire/admin qui consulte plusieurs locataires ;
    // un TENANT ne voit déjà que ses propres paiements.
    const tenantSearch: Prisma.LeaseWhereInput['tenant'] = query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    // Un locataire ne voit que ses propres paiements — pas de propertyVisibilityWhere
    // qui ne s'applique qu'aux propriétaires/gestionnaires.
    const leaseWhere: Prisma.LeaseWhereInput =
      user.role === 'TENANT'
        ? { tenantUserId: user.id, ...(query.propertyId ? { propertyId: query.propertyId } : {}) }
        : {
            property: propertyVisibilityWhere(user),
            ...(query.propertyId ? { propertyId: query.propertyId } : {}),
            ...(query.tenantUserId ? { tenantUserId: query.tenantUserId } : {}),
            ...(tenantSearch ? { tenant: tenantSearch } : {}),
          };

    const where: Prisma.PaymentWhereInput = {
      lease: leaseWhere,
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
        include: { lease: { include: { property: true, tenant: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data: data as unknown as Payment[], page, limit, total };
  }

  // Réservé au propriétaire/gestionnaire mandaté — confirme une déclaration
  // locataire (voir build-plan.md unité 20). Jamais applicable à un paiement
  // saisi manuellement (déjà PAID à la création) ni à un paiement PayDunya
  // (auto-confirmé par le webhook/la réconciliation, voir
  // reconcilePaydunyaPayment() et invariants architecture.md #4).
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
      this.logger.error(
        `[payments] notification rejet échouée pour payment=${rejected.id}`,
        notifyError,
      );
    }

    return rejected;
  }

  // Reçoit l'IPN PayDunya (voir /architect 2026-09-07) — le payload entrant
  // n'est jamais la source de vérité, juste un signal "va vérifier
  // maintenant" : paymentId vient de callback_url (que NOUS avons construit
  // à l'initiation, voir initiate()), jamais du corps de la requête, pour
  // rester indépendant du format exact du payload PayDunya.
  async handlePaydunyaCallback(paymentId: string | undefined): Promise<{ status: string }> {
    if (!paymentId) {
      this.logger.warn('[paydunya/webhook] callback reçu sans paymentId — ignoré');
      return { status: 'ignored' };
    }
    try {
      await this.reconcilePaydunyaPayment(paymentId);
    } catch (error) {
      // Ne jamais faire échouer l'accusé de réception PayDunya (voir
      // build-plan.md unité 18) — un échec inattendu ici se rattrape via le
      // cron de réconciliation, jamais via un retry PayDunya qu'on ne
      // contrôle pas.
      this.logger.error(`[paydunya/webhook] échec inattendu pour payment=${paymentId}`, error);
    }
    return { status: 'ok' };
  }

  // Revérifie le statut réel d'un Payment PAYDUNYA_API auprès de PayDunya et
  // met à jour en conséquence — réutilisé par le webhook (immédiat) et
  // PaydunyaReconciliationTask (rattrapage périodique, voir /architect
  // 2026-09-07). Idempotent par construction : un Payment déjà PAID/REJECTED
  // ne repasse jamais par ce chemin (voir le early-return ci-dessous), donc
  // deux appels concurrents (webhook + cron) n'ont pas d'effet dupliqué.
  async reconcilePaydunyaPayment(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { scheduleEntry: true },
    });
    if (!payment || payment.source !== 'PAYDUNYA_API' || payment.status !== 'PENDING') {
      return;
    }
    if (!payment.transactionId) {
      // Facture jamais créée avec succès chez PayDunya (échec réseau à
      // l'initiation, voir initiate()) — rien à vérifier auprès d'eux.
      return;
    }

    let paydunyaStatus: PaydunyaInvoiceStatus;
    try {
      paydunyaStatus = await this.paydunya.confirmInvoiceStatus(payment.transactionId);
    } catch (error) {
      this.logger.error(`[paydunya/reconcile] échec vérification pour payment=${paymentId}`, error);
      return; // on retentera au prochain webhook ou passage du cron
    }

    if (paydunyaStatus === 'completed') {
      const paidAmount = payment.scheduleEntry.paidAmount + payment.paidAmount;
      const updated = await this.prisma.$transaction(async (tx) => {
        const confirmed = await tx.payment.update({
          where: { id: paymentId },
          data: { status: 'PAID', paidAt: new Date() },
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
      return;
    }

    if (paydunyaStatus === 'cancelled' || paydunyaStatus === 'failed') {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REJECTED',
          rejectionReason: `Paiement PayDunya ${paydunyaStatus === 'cancelled' ? 'annulé' : 'échoué'}`,
        },
      });
      return;
    }

    // 'pending' — toujours en cours chez PayDunya, rien à faire. Au-delà du
    // délai d'abandon, on bascule quand même en REJECTED pour débloquer le
    // locataire (voir PaydunyaReconciliationTask, seul appelant qui atteint
    // ce cas en pratique — le webhook n'arrive jamais pour un paiement resté
    // réellement pending côté PayDunya).
    if (Date.now() - payment.createdAt.getTime() > PAYDUNYA_ABANDON_AFTER_MS) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Paiement PayDunya non confirmé après 24h — expiré',
        },
      });
    }
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
    if (payment.source === 'PAYDUNYA_API') {
      throw new ForbiddenException(
        'Un paiement PayDunya ne peut être confirmé ou rejeté manuellement',
      );
    }
    if (payment.status !== 'PENDING_CONFIRMATION') {
      throw new ConflictException("Ce paiement n'est pas en attente de confirmation");
    }
  }
}
