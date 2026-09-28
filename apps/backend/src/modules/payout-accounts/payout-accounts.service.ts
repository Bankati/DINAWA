import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PayoutAccount } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { NotifyService } from '../notify/notify.service';
import { TokenService } from '../auth/token.service';
import { UpsertPayoutAccountDto } from './dto/upsert-payout-account.dto';

const OPERATOR_LABEL = { TMONEY: 'T-Money', FLOOZ: 'Flooz' } as const;

// Numéro mobile money où un propriétaire/gestionnaire reçoit ses loyers (voir
// /architect reversement, 2026-09-25). Ce numéro décide où part l'argent des
// locataires : toute création/modification exige le mot de passe, laisse une
// trace dans PayoutAccountChange et prévient l'utilisateur par email — un
// compte laissé ouvert ou volé ne peut pas rediriger les loyers en silence.
@Injectable()
export class PayoutAccountsService {
  private readonly logger = new Logger(PayoutAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly notify: NotifyService,
  ) {}

  get(user: AuthenticatedUser): Promise<PayoutAccount | null> {
    return this.prisma.payoutAccount.findUnique({ where: { userId: user.id } });
  }

  async upsert(user: AuthenticatedUser, dto: UpsertPayoutAccountDto): Promise<PayoutAccount> {
    const fullUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      omit: { passwordHash: false },
    });
    const matches = await this.tokens.comparePassword(dto.password, fullUser.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    const existing = await this.prisma.payoutAccount.findUnique({ where: { userId: user.id } });
    // Ré-enregistrer les mêmes valeurs n'est pas un changement : pas de ligne
    // d'historique ni d'alerte email inutiles.
    if (existing && existing.operator === dto.operator && existing.phone === dto.phone) {
      return existing;
    }

    const saved = await this.prisma.$transaction(async (tx) => {
      const account = await tx.payoutAccount.upsert({
        where: { userId: user.id },
        create: { userId: user.id, operator: dto.operator, phone: dto.phone },
        update: { operator: dto.operator, phone: dto.phone },
      });
      await tx.payoutAccountChange.create({
        data: {
          userId: user.id,
          previousOperator: existing?.operator ?? null,
          previousPhone: existing?.phone ?? null,
          newOperator: dto.operator,
          newPhone: dto.phone,
        },
      });
      return account;
    });

    try {
      await this.notify.notifyUser({
        userId: user.id,
        event: 'payout-account-changed',
        variables: { operator: OPERATOR_LABEL[dto.operator], phone: dto.phone },
        forceEmail: true,
      });
    } catch (error) {
      // Le numéro est déjà enregistré — une alerte manquée ne doit pas faire
      // échouer la requête (même réflexe que PaymentsService.reject()).
      this.logger.error(`[payout-accounts] alerte de changement échouée user=${user.id}`, error);
    }

    return saved;
  }
}
