import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { propertyVisibilityWhere } from '../../common/permissions/property-access';
import { DashboardScope } from './dashboard.types';

// Décline propertyVisibilityWhere() (property-access.ts) en 3 variantes
// explicites plutôt que le simple OR global — voir /architect unité 32.
// MANAGED est le défaut de « bien géré » (mandat ACTIVE uniquement) ; ALL
// délègue directement à propertyVisibilityWhere() (même OR déjà maintenu
// là-bas, jamais une seconde copie — voir /review unité 32).
export function propertyScopeWhere(
  user: AuthenticatedUser,
  scope: DashboardScope,
): Prisma.PropertyWhereInput {
  switch (scope) {
    case DashboardScope.OWNED:
      return { ownerId: user.id };
    case DashboardScope.ALL:
      return propertyVisibilityWhere(user);
    case DashboardScope.MANAGED:
    default:
      return { mandates: { some: { managerId: user.id, status: 'ACTIVE' } } };
  }
}
