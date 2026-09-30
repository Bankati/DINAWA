import { Module } from '@nestjs/common';
import { PaydunyaService } from './paydunya.service';

// Extrait de PaymentsModule (voir /architect abonnements, 2026-09-30) —
// PaydunyaService est réutilisé par SubscriptionsModule (facturation
// d'abonnement, unité 36) ; un module dédié évite l'import circulaire
// PaymentsModule ↔ SubscriptionsModule qu'un export direct depuis
// PaymentsModule aurait créé (le webhook PayDunya, dans PaymentsModule, doit
// aussi router vers SubscriptionsService).
@Module({
  providers: [PaydunyaService],
  exports: [PaydunyaService],
})
export class PaydunyaModule {}
