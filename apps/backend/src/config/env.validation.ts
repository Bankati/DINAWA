import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsInt,
  IsEmail,
  Min,
  Max,
  validateSync,
} from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  // Base de données
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  DIRECT_URL!: string;

  // Supabase
  @IsUrl({ require_tld: false })
  SUPABASE_URL!: string;

  @IsString()
  SUPABASE_ANON_KEY!: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY!: string;

  // Signature des access tokens JWT maison (voir modules/auth/token.service.ts)
  // — authentification gérée entièrement côté NestJS depuis le 2026-08-11,
  // plus de vérification via l'API Admin Supabase. Générer avec :
  // node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  @IsString()
  JWT_SECRET!: string;

  @IsString()
  RESEND_API_KEY!: string;

  @IsEmail()
  RESEND_FROM_EMAIL!: string;

  @IsString()
  @IsOptional()
  RESEND_FROM_NAME?: string = 'WARAH';

  // Adresse recevant les messages du formulaire de contact public (/contact)
  @IsEmail()
  CONTACT_RECIPIENT_EMAIL!: string;

  // VAPID (Web Push)
  @IsString()
  VAPID_PUBLIC_KEY!: string;

  @IsString()
  VAPID_PRIVATE_KEY!: string;

  @IsString()
  VAPID_SUBJECT!: string;

  // PayDunya (optionnel — non disponible en dev sans compte marchand). Agrégateur
  // mobile money du client depuis le 2026-09-07 (voir /architect du même jour —
  // Cashpay n'a jamais été branché en réalité). Master key commune aux deux
  // modes ; jeu de 3 clés distinct par mode (test = bac à sable PayDunya, aucun
  // vrai argent ; live = production réelle).
  @IsString()
  @IsOptional()
  PAYDUNYA_MODE?: 'test' | 'live' = 'test';

  @IsString()
  @IsOptional()
  PAYDUNYA_MASTER_KEY?: string;

  @IsString()
  @IsOptional()
  PAYDUNYA_TEST_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  PAYDUNYA_TEST_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  PAYDUNYA_TEST_TOKEN?: string;

  @IsString()
  @IsOptional()
  PAYDUNYA_LIVE_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  PAYDUNYA_LIVE_PRIVATE_KEY?: string;

  @IsString()
  @IsOptional()
  PAYDUNYA_LIVE_TOKEN?: string;

  // URL publique de ce backend (avec suffixe /api, même convention que
  // NEXT_PUBLIC_API_URL côté frontend) — nécessaire pour construire le
  // callback_url envoyé à PayDunya lors de la création d'une facture (voir
  // PaymentsService.initiate()). PayDunya doit pouvoir nous rappeler depuis
  // l'extérieur — inutile en local sans tunnel (ngrok) : le cron de
  // réconciliation reste le seul filet de sécurité en dev.
  @IsUrl({ require_tld: false })
  @IsOptional()
  API_BASE_URL?: string = 'http://localhost:3001/api';

  // Sentry (optionnel — désactivé si absent)
  @IsUrl()
  @IsOptional()
  SENTRY_DSN?: string;

  // CORS
  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS?: string = 'http://localhost:4300';

  // URL du frontend — utilisée comme redirectTo du lien de confirmation
  // d'email généré par Supabase Auth (voir AuthService.signupOwner)
  @IsUrl({ require_tld: false })
  FRONTEND_URL!: string;

  // Secret HMAC pour signer les tokens d'invitation locataire (voir
  // src/common/utils/invitation-token.ts) — générer avec :
  // node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  @IsString()
  INVITATION_TOKEN_SECRET!: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  // Une variable optionnelle laissée vide dans .env (`PAYDUNYA_MASTER_KEY=`) est lue
  // comme une chaîne vide, pas `undefined` — @IsOptional() ne l'ignore donc pas.
  // On normalise ici pour que "vide" et "absente" soient traités de la même façon.
  const sanitized = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value === '' ? undefined : value]),
  );

  const validatedConfig = plainToInstance(EnvironmentVariables, sanitized, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => `  ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');

    throw new Error(
      `[Config] Variables d'environnement invalides — l'application ne peut pas démarrer:\n${messages}\n\nConsultez .env.example et docs/ENV.md`,
    );
  }

  return validatedConfig;
}
