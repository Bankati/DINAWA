import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';

function makeContext(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeHandler(response: unknown): CallHandler {
  return { handle: () => of(response) };
}

describe('AuditLogInterceptor', () => {
  let prisma: { auditLog: { create: jest.Mock } };
  let interceptor: AuditLogInterceptor;

  beforeEach(() => {
    prisma = { auditLog: { create: jest.fn().mockResolvedValue({}) } };
    interceptor = new AuditLogInterceptor(prisma as never);
  });

  function flush(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
  }

  it('ignore les requêtes GET (non mutantes)', async () => {
    const req = { method: 'GET', route: { path: '/api/properties' }, params: {}, body: {} };
    interceptor.intercept(makeContext(req), makeHandler({})).subscribe();
    await flush();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('logue une requête PATCH authentifiée avec entityId depuis les params', async () => {
    const req = {
      method: 'PATCH',
      route: { path: '/api/properties/:id' },
      params: { id: 'prop-1' },
      body: { address: '123 rue X' },
      user: { id: 'user-1' },
      ip: '10.0.0.1',
    };

    interceptor.intercept(makeContext(req), makeHandler({ id: 'prop-1' })).subscribe();
    await flush();

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user-1',
        action: 'PATCH /api/properties/:id',
        entityType: 'properties',
        entityId: 'prop-1',
        metadata: { address: '123 rue X' },
        ipAddress: '10.0.0.1',
      },
    });
  });

  it("déduit l'acteur depuis la réponse sur une route publique (login)", async () => {
    const req = {
      method: 'POST',
      route: { path: '/api/auth/login' },
      params: {},
      body: { email: 'a@a.com', password: 'secret123' },
    };

    interceptor
      .intercept(
        makeContext(req),
        makeHandler({ accessToken: 'abc', refreshToken: 'def', user: { id: 'user-42' } }),
      )
      .subscribe();
    await flush();

    const [callArgs] = prisma.auditLog.create.mock.calls[0] as [{ data: { actorUserId: string } }];
    expect(callArgs.data.actorUserId).toBe('user-42');
  });

  it('rédige les champs sensibles (password, token, otp, secret) avant stockage', async () => {
    const req = {
      method: 'POST',
      route: { path: '/api/auth/login' },
      params: {},
      body: {
        email: 'a@a.com',
        password: 'secret123',
        nested: { refreshToken: 'zzz', otpCode: '123456' },
      },
    };

    interceptor.intercept(makeContext(req), makeHandler({ user: { id: 'user-1' } })).subscribe();
    await flush();

    const [callArgs] = prisma.auditLog.create.mock.calls[0] as [
      { data: { metadata: Record<string, unknown> } },
    ];
    expect(callArgs.data.metadata['password']).toBe('[REDACTED]');
    expect((callArgs.data.metadata['nested'] as Record<string, unknown>)['refreshToken']).toBe(
      '[REDACTED]',
    );
    expect((callArgs.data.metadata['nested'] as Record<string, unknown>)['otpCode']).toBe(
      '[REDACTED]',
    );
    expect(callArgs.data.metadata['email']).toBe('a@a.com');
  });

  it("n'échoue jamais la requête si l'écriture de l'audit log échoue", async () => {
    prisma.auditLog.create.mockRejectedValueOnce(new Error('db down'));
    const req = {
      method: 'DELETE',
      route: { path: '/api/admin/users/:id' },
      params: { id: 'u1' },
      body: {},
      user: { id: 'admin1' },
    };

    const observable = interceptor.intercept(makeContext(req), makeHandler({ message: 'ok' }));
    let emitted: unknown;
    observable.subscribe((v) => (emitted = v));
    await flush();

    expect(emitted).toEqual({ message: 'ok' });
  });
});
