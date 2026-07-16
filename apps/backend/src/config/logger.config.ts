import type { Params } from 'nestjs-pino';

export const pinoConfig: Params = {
  pinoHttp: {
    level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',

    // Redaction des champs sensibles — ne jamais logger ces valeurs
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.cni',
        'req.body.cniNumber',
        'req.body.phoneNumber',
        'req.body.token',
        'req.body.secret',
        '*.password',
        '*.token',
        '*.secret',
        '*.apiKey',
        '*.webhookSecret',
        '*.vapidPrivateKey',
      ],
      censor: '[REDACTED]',
    },

    // Formattage lisible en développement uniquement — `pino-pretty` est une
    // devDependency, absente de l'image de production (`npm prune --omit=dev`
    // dans le Dockerfile). Condition en liste blanche (`=== 'development'`)
    // plutôt qu'en liste noire (`!== 'production'`) : tout environnement qui
    // n'est pas explicitement 'development' (production, staging, test...)
    // doit recevoir du JSON structuré, jamais tenter de charger pino-pretty
    // — sinon crash immédiat au démarrage (`unable to determine transport
    // target for "pino-pretty"`), trouvé en testant l'image Docker en local
    // avec NODE_ENV=development.
    transport:
      process.env['NODE_ENV'] === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }
        : undefined,

    // Sérialisation minimale des requêtes (pas de duplication de champs sensibles)
    serializers: {
      req(req: { method: string; url: string; id: string }) {
        return { method: req.method, url: req.url, id: req.id };
      },
      res(res: { statusCode: number }) {
        return { statusCode: res.statusCode };
      },
    },

    customProps: () => ({
      service: 'warah-backend',
      timezone: 'Africa/Lome',
    }),
  },
};
