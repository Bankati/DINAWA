import { propertyVisibilityWhere } from './property-access';
import { AuthenticatedUser } from '../types/authenticated-user.type';

describe('propertyVisibilityWhere', () => {
  it('ne filtre rien pour un ADMIN — voit tout le parc', () => {
    const admin = { id: 'admin-1', role: 'ADMIN' } as AuthenticatedUser;
    expect(propertyVisibilityWhere(admin)).toEqual({});
  });

  it('filtre sur ownerId OU mandat actif pour un OWNER/MANAGER — même règle que canActOnProperty().canRead', () => {
    const owner = { id: 'owner-1', role: 'OWNER' } as AuthenticatedUser;
    expect(propertyVisibilityWhere(owner)).toEqual({
      OR: [
        { ownerId: 'owner-1' },
        { mandates: { some: { managerId: 'owner-1', status: 'ACTIVE' } } },
      ],
    });
  });

  it('applique la même règle à un MANAGER', () => {
    const manager = { id: 'manager-1', role: 'MANAGER' } as AuthenticatedUser;
    expect(propertyVisibilityWhere(manager)).toEqual({
      OR: [
        { ownerId: 'manager-1' },
        { mandates: { some: { managerId: 'manager-1', status: 'ACTIVE' } } },
      ],
    });
  });
});
