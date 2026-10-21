import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { withAdvisoryLock } from '../../common/utils/advisory-lock';
import { CRON_WHATSAPP_INBOUND_RECOVERY } from '../../common/constants';
import { WhatsappInboundProcessor } from '../whatsapp-webhook/whatsapp-inbound.processor';

const ADVISORY_LOCK_KEY = 'whatsapp-inbound-recovery-task';

// Rattrapage des messages WhatsApp reçus dont le traitement a été
// interrompu (redémarrage Railway entre la réponse 200 à Meta et la fin du
// traitement) — unité 44, /architect 2026-10-13, décision 5.
@Injectable()
export class WhatsappInboundRecoveryTask {
  private readonly logger = new Logger(WhatsappInboundRecoveryTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: WhatsappInboundProcessor,
  ) {}

  @Cron(CRON_WHATSAPP_INBOUND_RECOVERY)
  async run(): Promise<void> {
    const recovered = await withAdvisoryLock(this.prisma, ADVISORY_LOCK_KEY, () => this.processor.recoverPending());
    if (recovered === null) {
      this.logger.warn('[whatsapp-inbound-recovery] exécution ignorée — une instance détient déjà le verrou');
    } else if (recovered > 0) {
      this.logger.log(`[whatsapp-inbound-recovery] ${recovered} message(s) repris`);
    }
  }
}
