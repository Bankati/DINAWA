import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const ALLOW_WHILE_SUSPENDED_KEY = 'allowWhileSuspended';

// Exception explicite au blocage des mutations pour SUSPENDED_INACTIVITY/
// SUSPENDED_PAYMENT (voir architecture.md, modèle d'auth) — réservée aux
// actions dont le but même est de débloquer le compte (ex. POST /properties,
// voir build-plan.md unité 11 : « déblocage automatique et immédiat dès
// qu'un bien est créé »). Sans cette exception, un compte suspendu ne peut
// jamais se débloquer lui-même puisque le guard rejetterait la mutation
// avant que le service ait la chance d'appeler
// AccountActivationService.reactivateIfEligible(). N'a aucun effet sur
// SUSPENDED_ADMIN, toujours rejeté en 401 avant ce point du guard.
export const AllowWhileSuspended = (): CustomDecorator<string> =>
  SetMetadata(ALLOW_WHILE_SUSPENDED_KEY, true);
