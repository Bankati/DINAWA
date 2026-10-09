import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PropertyType } from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { PaydunyaPaymentMethod } from '../payments/dto/initiate-payment.dto';
import { signToken, verifyToken } from '../../common/utils/signed-token';
import { PAY_LINK_VALID_DAYS_AFTER_DUE } from '../../common/constants';

type PayLinkData = { e: string };

// PAYABLE : le payeur peut lancer (ou reprendre) un paiement.
// PAID : rien à payer. UNAVAILABLE : le responsable du bien n'a pas de numéro
// de reversement, le paiement en ligne serait refusé (il en est prévenu par
// PaymentsService, au plus une fois par jour, au clic sur « Payer »).
export type PayLinkStatus = 'PAYABLE' | 'PAID' | 'UNAVAILABLE';

// Seules informations exposées par la page publique (/architect unité 43) :
// assez pour reconnaître le bon loyer, rien qui révèle la vie privée du
// locataire — jamais nom de famille, téléphone, adresse précise, propriétaire
// ou autres paiements. Le lien peut avoir été transféré à un tiers.
export type PayLinkView = {
  status: PayLinkStatus;
  // Un paiement PayDunya est déjà ouvert pour ce loyer : « Payer » le reprend.
  paymentInProgress: boolean;
  tenantFirstName: string;
  propertyType: PropertyType;
  building: string | null;
  neighborhood: string;
  city: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  rentAmount: number;
  feeAmount: number;
  totalAmount: number;
  expiresAt: Date;
};

// Lien de paiement sans connexion (unité 43, phase 12). Le jeton signé ne
// porte que l'identifiant de l'échéance et une expiration (échéance + 30 j) :
// il prouve le droit de payer CE loyer, rien d'autre. Toutes les règles du
// paiement restent dans PaymentsService (initiateForEntry / quoteEntry).
@Injectable()
export class PayLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly payments: PaymentsService,
  ) {}

  // Utilisé par les rappels (unité 46) et le robot WhatsApp (unité 47).
  async createPayLink(scheduleEntryId: string): Promise<string> {
    const entry = await this.prisma.paymentScheduleEntry.findUnique({
      where: { id: scheduleEntryId },
      select: { id: true, dueDate: true },
    });
    if (!entry) throw new NotFoundException('Échéance introuvable');

    const token = signToken<PayLinkData>(
      {
        purpose: 'pay-link',
        data: { e: entry.id },
        expiresAt: addDays(entry.dueDate, PAY_LINK_VALID_DAYS_AFTER_DUE),
      },
      this.secret(),
    );
    return `${this.frontendUrl()}/payer/${token}`;
  }

  async getView(token: string): Promise<PayLinkView> {
    const entryId = this.verify(token);
    const entry = await this.prisma.paymentScheduleEntry.findUnique({
      where: { id: entryId },
      include: {
        lease: { include: { property: true, tenant: { select: { firstName: true } } } },
        payments: {
          where: { source: 'PAYDUNYA_API', status: 'PENDING' },
          select: { id: true },
          take: 1,
        },
      },
    });
    // Message identique à un jeton invalide : ne jamais confirmer qu'une
    // échéance a existé à quelqu'un qui teste des liens.
    if (!entry) throw new NotFoundException('Lien invalide');

    const quote = await this.payments.quoteEntry(entry);
    const { property } = entry.lease;
    return {
      status: quote.rentAmount <= 0 ? 'PAID' : quote.payoutReady ? 'PAYABLE' : 'UNAVAILABLE',
      paymentInProgress: entry.payments.length > 0,
      tenantFirstName: entry.lease.tenant.firstName,
      propertyType: property.type,
      building: property.building,
      neighborhood: property.neighborhood,
      city: property.city,
      periodStart: entry.periodStart,
      periodEnd: entry.periodEnd,
      dueDate: entry.dueDate,
      rentAmount: quote.rentAmount,
      feeAmount: quote.feeAmount,
      totalAmount: quote.totalAmount,
      expiresAt: addDays(entry.dueDate, PAY_LINK_VALID_DAYS_AFTER_DUE),
    };
  }

  // Retour PayDunya vers les pages publiques du lien (jamais vers l'espace
  // locataire, qui exige une connexion).
  async initiate(
    token: string,
    paymentMethod: PaydunyaPaymentMethod,
  ): Promise<{ checkoutUrl: string }> {
    const entryId = this.verify(token);
    const pageUrl = `${this.frontendUrl()}/payer/${token}`;
    const { checkoutUrl } = await this.payments.initiateForEntry(entryId, {
      paymentMethod,
      returnUrl: `${pageUrl}/merci`,
      cancelUrl: `${pageUrl}?paiement=annule`,
    });
    return { checkoutUrl };
  }

  private verify(token: string): string {
    return verifyToken<PayLinkData>(token, 'pay-link', this.secret()).e;
  }

  private secret(): string {
    return this.config.getOrThrow<string>('PAY_LINK_SECRET');
  }

  private frontendUrl(): string {
    return this.config.getOrThrow<string>('FRONTEND_URL');
  }
}
