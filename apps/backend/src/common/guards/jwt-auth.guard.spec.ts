import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_WHILE_SUSPENDED_KEY } from '../decorators/allow-while-suspended.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let tokens: { verifyAccessToken: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };
  let cache: { get: jest.Mock; set: jest.Mock };

  type FakeRequest = { user?: unknown; headers: { authorization?: string }; method: string };

  function buildContext(options: {
    method?: string;
    authorization?: string;
    isPublic?: boolean;
    allowWhileSuspended?: boolean;
  }): { context: ExecutionContext; request: FakeRequest } {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return options.isPublic ?? false;
      if (key === ALLOW_WHILE_SUSPENDED_KEY) return options.allowWhileSuspended ?? false;
      return false;
    });
    const request: FakeRequest = {
      method: options.method ?? 'GET',
      headers: options.authorization ? { authorization: options.authorization } : {},
    };
    const context = {
      getHandler: (): undefined => undefined,
      getClass: (): undefined => undefined,
      switchToHttp: (): { getRequest: () => FakeRequest } => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    tokens = {
      verifyAccessToken: jest.fn().mockReturnValue({ sub: 'user-1', role: 'OWNER' }),
    };
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', accountStatus: 'ACTIVE' }),
      },
    };
    // Cache toujours miss dans les tests (on vérifie le chemin normal)
    cache = { get: jest.fn().mockReturnValue(null), set: jest.fn() };
    guard = new JwtAuthGuard(reflector as never, tokens as never, prisma as never, cache as never);
  });

  it('laisse passer sans token les routes marquées @Public()', async () => {
    const { context } = buildContext({ isPublic: true });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("rejette avec 401 en l'absence de token", async () => {
    const { context } = buildContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejette avec 401 si le JWT est invalide ou expiré', async () => {
    tokens.verifyAccessToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const { context } = buildContext({ authorization: 'Bearer x' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejette avec 401 si aucun User Prisma ne correspond au `sub` du JWT', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const { context } = buildContext({ authorization: 'Bearer x' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejette avec 401 un compte SUSPENDED_ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', accountStatus: 'SUSPENDED_ADMIN' });
    const { context } = buildContext({ authorization: 'Bearer x' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejette avec 403 ACCOUNT_SUSPENDED une mutation sur un compte SUSPENDED_INACTIVITY', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      accountStatus: 'SUSPENDED_INACTIVITY',
    });
    const { context } = buildContext({ authorization: 'Bearer x', method: 'POST' });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it(
    'laisse passer une mutation @AllowWhileSuspended() sur un compte SUSPENDED_INACTIVITY ' +
      '— sinon le compte ne pourrait jamais se débloquer lui-même',
    async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        accountStatus: 'SUSPENDED_INACTIVITY',
      });
      const { context, request } = buildContext({
        authorization: 'Bearer x',
        method: 'POST',
        allowWhileSuspended: true,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toEqual({ id: 'user-1', accountStatus: 'SUSPENDED_INACTIVITY' });
    },
  );

  it('laisse passer une lecture (GET) sur un compte SUSPENDED_PAYMENT', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', accountStatus: 'SUSPENDED_PAYMENT' });
    const { context, request } = buildContext({ authorization: 'Bearer x', method: 'GET' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', accountStatus: 'SUSPENDED_PAYMENT' });
  });

  it("injecte l'User Prisma dans request.user et autorise un compte actif", async () => {
    const { context, request } = buildContext({ authorization: 'Bearer x' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', accountStatus: 'ACTIVE' });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });
});
