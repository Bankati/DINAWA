import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_WHILE_SUSPENDED_KEY } from '../decorators/allow-while-suspended.decorator';

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let supabaseAdmin: { auth: { getUser: jest.Mock } };
  let prisma: { user: { findUnique: jest.Mock } };

  const confirmedSupabaseUser = {
    id: 'supabase-uid-1',
    email_confirmed_at: '2026-07-01T00:00:00.000Z',
  };

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
    supabaseAdmin = {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: confirmedSupabaseUser }, error: null }),
      },
    };
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', accountStatus: 'ACTIVE' }),
      },
    };
    guard = new SupabaseAuthGuard(reflector as never, supabaseAdmin as never, prisma as never);
  });

  it('laisse passer sans token les routes marquées @Public()', async () => {
    const { context } = buildContext({ isPublic: true });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("rejette avec 401 en l'absence de token", async () => {
    const { context } = buildContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejette avec 401 si le token Supabase est invalide', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid' },
    });
    const { context } = buildContext({ authorization: 'Bearer x' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("rejette avec 403 EMAIL_NOT_CONFIRMED si l'email Supabase n'est pas confirmé", async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { ...confirmedSupabaseUser, email_confirmed_at: null } },
      error: null,
    });
    const { context } = buildContext({ authorization: 'Bearer x' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejette avec 401 si aucun User Prisma ne correspond', async () => {
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

  it("injecte l'User Prisma dans request.user et autorise un compte actif confirmé", async () => {
    const { context, request } = buildContext({ authorization: 'Bearer x' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', accountStatus: 'ACTIVE' });
  });
});
