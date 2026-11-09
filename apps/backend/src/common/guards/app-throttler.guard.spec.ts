import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppThrottlerGuard } from './app-throttler.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Accès à la méthode protégée getTracker, seule logique propre à ce garde.
type TrackerAccess = { getTracker(req: unknown, context?: ExecutionContext): Promise<string> };

describe('AppThrottlerGuard', () => {
  const context = {
    getHandler: (): undefined => undefined,
    getClass: (): undefined => undefined,
  } as unknown as ExecutionContext;
  const authenticatedReq = { ip: '10.0.0.1', headers: { authorization: 'Bearer jwt-valide' } };

  function build(isPublic: boolean): TrackerAccess {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => (key === IS_PUBLIC_KEY ? isPublic : undefined)),
    } as unknown as Reflector;
    const tokens = { verifyAccessToken: jest.fn().mockReturnValue({ sub: 'user-1' }) };
    return new AppThrottlerGuard(
      { throttlers: [] },
      {} as never,
      reflector,
      tokens as never,
    ) as unknown as TrackerAccess;
  }

  it('route publique : compte par IP même avec un badge valide (un compte gratuit ne donne pas un nouveau quota, audit sécurité E1)', async () => {
    await expect(build(true).getTracker(authenticatedReq, context)).resolves.toBe('10.0.0.1');
  });

  it('route protégée : compte par utilisateur (NAT mobile partagé)', async () => {
    await expect(build(false).getTracker(authenticatedReq, context)).resolves.toBe('user:user-1');
  });

  it('sans badge : compte par IP', async () => {
    await expect(build(false).getTracker({ ip: '10.0.0.2', headers: {} }, context)).resolves.toBe(
      '10.0.0.2',
    );
  });
});
