import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AccountController } from '../../modules/account/account.controller';
import { AdminController } from '../../modules/admin/admin.controller';
import { AuthController } from '../../modules/auth/auth.controller';
import { ContactController } from '../../modules/contact/contact.controller';
import { DashboardManagerController } from '../../modules/dashboard/dashboard-manager.controller';
import { DashboardController } from '../../modules/dashboard/dashboard.controller';
import { LeasesController } from '../../modules/leases/leases.controller';
import { ListingsController } from '../../modules/listings/listings.controller';
import { ManagerReportsController } from '../../modules/manager-reports/manager-reports.controller';
import { ManagerReviewsController } from '../../modules/manager-reviews/manager-reviews.controller';
import { PublicManagersController } from '../../modules/manager-reviews/public-managers.controller';
import { ManagerController } from '../../modules/mandates/manager.controller';
import { ManagersController } from '../../modules/mandates/managers.controller';
import { MandatesController } from '../../modules/mandates/mandates.controller';
import { NotifyController } from '../../modules/notify/notify.controller';
import { PaymentDeclarationsController } from '../../modules/payment-declarations/payment-declarations.controller';
import { PaydunyaWebhookController } from '../../modules/payments/paydunya-webhook.controller';
import { PaymentsController } from '../../modules/payments/payments.controller';
import { PayoutsWebhookController } from '../../modules/payouts/payouts-webhook.controller';
import { PayoutsController } from '../../modules/payouts/payouts.controller';
import { ProfileController } from '../../modules/profile/profile.controller';
import { PropertiesController } from '../../modules/properties/properties.controller';
import { PushController } from '../../modules/push/push.controller';
import { SubscriptionsController } from '../../modules/subscriptions/subscriptions.controller';
import { PropertyTenantsController } from '../../modules/tenants/property-tenants.controller';
import { TenantsController } from '../../modules/tenants/tenants.controller';

// Ce test n'a qu'un seul but : lister, par réflexion sur les décorateurs
// Nest réels (jamais retranscrits à la main), toutes les routes mutantes
// (POST/PUT/PATCH/DELETE) qui existent vraiment dans le backend — avec le
// préfixe global "/api" ajouté manuellement (posé au bootstrap dans main.ts,
// donc invisible depuis les métadonnées des controllers).
//
// Le snapshot ci-dessous est la référence à consulter quand on ajoute,
// renomme ou supprime une route mutante : s'il change, c'est le signal pour
// vérifier si `apps/frontend/src/lib/audit-log-labels.ts` (ACTION_LABELS)
// a besoin d'une mise à jour correspondante. Ce test ne lit PAS ce fichier
// frontend (pas de dépendance inter-paquets en CI) — voir la limite
// documentée dans audit-log-labels.spec.ts côté frontend.
// (Correctif /review, 2026-10-03.)

const MUTATING_METHODS = new Set<RequestMethod>([
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
]);

const METHOD_NAME: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.ALL]: 'ALL',
  [RequestMethod.OPTIONS]: 'OPTIONS',
  [RequestMethod.HEAD]: 'HEAD',
};

function joinPaths(base: string, sub: string): string {
  const cleanBase = base.replace(/^\/+|\/+$/g, '');
  const cleanSub = sub.replace(/^\/+|\/+$/g, '');
  const joined = [cleanBase, cleanSub].filter(Boolean).join('/');
  return `/api/${joined}`.replace(/\/+$/, '') || '/api';
}

function getMutatingRoutes(ControllerClass: new (...args: never[]) => unknown): string[] {
  const basePathRaw =
    (Reflect.getMetadata(PATH_METADATA, ControllerClass) as string | string[]) ?? '';
  const basePaths = Array.isArray(basePathRaw) ? basePathRaw : [basePathRaw];
  const prototype = (ControllerClass as { prototype: object }).prototype;
  const methodNames = Object.getOwnPropertyNames(prototype).filter(
    (name) => name !== 'constructor',
  );

  const routes: string[] = [];
  for (const methodName of methodNames) {
    const handler = (prototype as Record<string, object>)[methodName];
    const httpMethod = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
    if (httpMethod === undefined || !MUTATING_METHODS.has(httpMethod)) continue;

    const subPathRaw = (Reflect.getMetadata(PATH_METADATA, handler) as string | string[]) ?? '';
    const subPaths = Array.isArray(subPathRaw) ? subPathRaw : [subPathRaw];

    for (const basePath of basePaths) {
      for (const subPath of subPaths) {
        routes.push(`${METHOD_NAME[httpMethod]} ${joinPaths(basePath, subPath)}`);
      }
    }
  }
  return routes;
}

const ALL_CONTROLLERS: Array<new (...args: never[]) => unknown> = [
  AccountController,
  AdminController,
  AuthController,
  ContactController,
  DashboardManagerController,
  DashboardController,
  LeasesController,
  ListingsController,
  ManagerReportsController,
  ManagerReviewsController,
  PublicManagersController,
  ManagerController,
  ManagersController,
  MandatesController,
  NotifyController,
  PaymentDeclarationsController,
  PaydunyaWebhookController,
  PaymentsController,
  PayoutsWebhookController,
  PayoutsController,
  ProfileController,
  PropertiesController,
  PushController,
  SubscriptionsController,
  PropertyTenantsController,
  TenantsController,
];

describe('Routes mutantes réelles du backend (réflexion Nest)', () => {
  it('liste toutes les routes POST/PUT/PATCH/DELETE — snapshot à vérifier à chaque changement', () => {
    const allRoutes = ALL_CONTROLLERS.flatMap(getMutatingRoutes).sort();
    expect(allRoutes).toMatchSnapshot();
  });
});
