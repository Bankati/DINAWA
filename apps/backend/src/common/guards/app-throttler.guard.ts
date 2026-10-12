import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Request } from 'express';
import { TokenService } from '../../modules/auth/token.service';

// Suit le quota par utilisateur authentifié plutôt que par IP.
// ThrottlerGuard s'exécute AVANT JwtAuthGuard dans app.module.ts, donc
// request.user n'est pas encore disponible ici — on décode le JWT
// nous-mêmes, uniquement pour en extraire un identifiant de suivi (la
// vérification d'authenticité reste l'unique responsabilité de
// JwtAuthGuard, qui s'exécute ensuite). Sans ça, des utilisateurs
// légitimes partageant une même IP (NAT mobile, courant au Togo) finissent
// par s'épuiser mutuellement le quota global.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly tokens: TokenService,
  ) {
    super(options, storageService, reflector);
  }

  // Synchrone (verifyAccessToken ne fait qu'un décodage JWT en mémoire) —
  // enveloppé dans Promise.resolve() pour respecter la signature de la
  // classe parente.
  protected override getTracker(req: Request): Promise<string> {
    const header = req.headers?.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.slice('Bearer '.length).trim();
      if (token) {
        try {
          const payload = this.tokens.verifyAccessToken(token);
          return Promise.resolve(`user:${payload.sub}`);
        } catch {
          // Token invalide/expiré — retombe sur l'IP, JwtAuthGuard
          // rejettera la requête de toute façon juste après.
        }
      }
    }
    return Promise.resolve(req.ip ?? '');
  }
}
