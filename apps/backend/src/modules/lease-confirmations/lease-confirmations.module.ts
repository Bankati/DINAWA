import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListingsModule } from '../listings/listings.module';
import { LeaseConfirmationsController } from './lease-confirmations.controller';
import { MyLeaseConfirmationsController } from './my-lease-confirmations.controller';
import { LeaseConfirmationsService } from './lease-confirmations.service';

// Accord du locataire déjà inscrit (registre des décisions, 09/11/2026).
// La création de la demande vit dans AuthService.inviteTenant() (même
// transaction que le bail) ; ce module gère la suite : listes, réponses,
// annulation, renvoi (qui réutilise AuthService), rappels et expiration.
// Utilisé par le robot WhatsApp (boutons) et par la tâche planifiée.
// AuthModule n'importe pas ce module : pas de dépendance circulaire.
@Module({
  imports: [AuthModule, ListingsModule],
  controllers: [LeaseConfirmationsController, MyLeaseConfirmationsController],
  providers: [LeaseConfirmationsService],
  exports: [LeaseConfirmationsService],
})
export class LeaseConfirmationsModule {}
