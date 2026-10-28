import { Prisma, Property } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

export type PropertyAccessor = {
  canRead: boolean;
  canMutate: boolean;
  isOwner: boolean;
  isMandatedManager: boolean;
};

// Autorité unique pour décider qui peut agir sur un bien — jamais de
// vérification inline `if (property.ownerId === user.id)` ailleurs dans
// le code métier (voir architecture.md, invariant #2).
export async function canActOnProperty(
  prisma: PrismaService,
  user: AuthenticatedUser,
  property: Property,
): Promise<PropertyAccessor> {
  if (user.role === 'ADMIN') {
    return { canRead: true, canMutate: true, isOwner: false, isMandatedManager: false };
  }

  const activeMandate = await prisma.mandate.findFirst({
    where: { propertyId: property.id, status: 'ACTIVE' },
  });

  const isOwner = property.ownerId === user.id;
  const isMandatedManager = activeMandate?.managerId === user.id;

  if (isMandatedManager) {
    return { canRead: true, canMutate: true, isOwner: false, isMandatedManager: true };
  }
  if (isOwner) {
    return { canRead: true, canMutate: !activeMandate, isOwner: true, isMandatedManager: false };
  }
  return { canRead: false, canMutate: false, isOwner: false, isMandatedManager: false };
}

// Qui doit être notifié pour un événement propre à ce bien (déclaration de
// paiement, alerte d'impayé...) : le gestionnaire mandaté s'il y en a un
// actif, sinon le propriétaire — jamais les deux (voir build-plan.md unités
// 20 et 25). Co-localisé avec canActOnProperty() : même requête de mandat,
// même définition de "qui agit sur ce bien".
export async function resolveResponsibleUserId(
  prisma: PrismaService,
  property: Property,
): Promise<string> {
  const activeMandate = await prisma.mandate.findFirst({
    where: { propertyId: property.id, status: 'ACTIVE' },
  });
  return responsibleUserIdFor(property, activeMandate);
}

// Même règle, sans requête, quand le mandat actif est déjà chargé (listes,
// messagerie unité 48 — pas de N+1).
export function responsibleUserIdFor(
  property: { ownerId: string },
  activeMandate: { managerId: string } | null | undefined,
): string {
  return activeMandate?.managerId ?? property.ownerId;
}

// Biens dont l'utilisateur est le RESPONSABLE (gestionnaire mandaté actif,
// sinon propriétaire sans mandat actif) — filtre Prisma équivalent à
// resolveResponsibleUserId() === userId, pour un comptage en une requête.
export function propertyResponsibleWhere(userId: string): Prisma.PropertyWhereInput {
  return {
    OR: [
      { mandates: { some: { managerId: userId, status: 'ACTIVE' } } },
      { ownerId: userId, mandates: { none: { status: 'ACTIVE' } } },
    ],
  };
}

// Équivalent de canActOnProperty().canRead, mais exprimé comme filtre
// Prisma pour une liste plutôt que pour un Property déjà chargé (canRead
// est vrai pour : ADMIN, propriétaire, ou mandataire actif — voir la
// logique ci-dessus). Co-localisé ici volontairement : toute évolution de
// canActOnProperty() doit se refléter ici aussi (voir /review unité 12).
export function propertyVisibilityWhere(user: AuthenticatedUser): Prisma.PropertyWhereInput {
  if (user.role === 'ADMIN') return {};

  return {
    OR: [{ ownerId: user.id }, { mandates: { some: { managerId: user.id, status: 'ACTIVE' } } }],
  };
}
