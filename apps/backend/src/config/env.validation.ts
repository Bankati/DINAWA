import {
  IsString,
  IsOptional,
  IsEnum,
  IsIn,
  IsUrl,
  IsInt,
  IsNumber,
  IsEmail,
  Min,
  Max,
  IsBoolean,
  Matches,
  ValidateIf,
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
  // @IsIn strict — une faute de frappe ('live ', 'LIVE', 'production') doit
  // faire crasher le démarrage, pas retomber silencieusement sur les clés
  // sandbox en production (trouvé en /review 2026-09-10).
  @IsIn(['test', 'live'])
  @IsOptional()
  PAYDUNYA_MODE?: 'test' | 'live' = 'test';

  @IsString()
  @IsOptional()
  PAYDUNYA_MASTER_KEY?: string;

  // Non envoyée par PaydunyaService (Master/Private/Token seuls suffisent
  // pour créer/confirmer une facture, doc PayDunya 2026-09-11) — conservée
  // pour référence/usages futurs (ex. Softpay).
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

  // Frais de service payés par le locataire en plus du loyer (voir
  // src/common/utils/payment-fees.ts) : pourcentage du loyer + montant fixe.
  // À régler d'après la grille tarifaire PayDunya ; 0 par défaut = WARAH
  // absorbe tous les frais tant que ce n'est pas configuré.
  @Transform(({ value }: { value: unknown }) => (value === undefined ? 0 : Number(value)))
  @IsNumber()
  @Min(0)
  @Max(20)
  @IsOptional()
  TENANT_FEE_PERCENT?: number = 0;

  @Transform(({ value }: { value: unknown }) => (value === undefined ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  TENANT_FEE_FIXED_FCFA?: number = 0;

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

  // Secret HMAC des liens de paiement publics /payer/<jeton> (voir
  // src/common/utils/signed-token.ts, phase 12) — distinct
  // d'INVITATION_TOKEN_SECRET : la fuite de l'un ne compromet pas l'autre.
  // Générer comme ci-dessus. Obligatoire depuis l'unité 43 (lien de paiement
  // public, PayLinksService) — facultatif à l'unité 42 tant qu'aucun code ne
  // s'en servait. À créer sur Railway (staging + production) AVANT de
  // déployer, sinon le démarrage échoue.
  @IsString()
  PAY_LINK_SECRET!: string;

  // Nombre de proxys de confiance devant le backend (Express `trust proxy`) —
  // détermine l'adresse IP cliente utilisée par les limites de débit. 0 par
  // défaut (sûr : aucun en-tête X-Forwarded-For n'est cru). Sur Railway, mettre
  // le nombre exact de proxys vérifié en staging (normalement 1) : une valeur
  // trop haute laisserait un client forger son adresse et contourner le
  // portier ; trop basse, tous les clients partageraient l'adresse du proxy.
  @Transform(({ value }: { value: unknown }) => (value === undefined ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  @Max(5)
  @IsOptional()
  TRUST_PROXY_HOPS?: number = 0;

  // Diagnostic TEMPORAIRE de staging : journalise, pour les premières
  // requêtes, le NOMBRE d'adresses reçues dans X-Forwarded-For (jamais les
  // adresses elles-mêmes) pour fixer TRUST_PROXY_HOPS. À retirer après usage.
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
    const raw = obj[key];
    return raw === true || raw === 'true';
  })
  @IsBoolean()
  @IsOptional()
  TRUST_PROXY_DIAGNOSTIC?: boolean = false;

  // Canal WhatsApp (phase 12, unité 42) — interrupteur général : false coupe
  // tout le canal pour tout le monde sans redéployer (Meta en panne, numéro
  // bloqué...). Lu sur la valeur BRUTE (`obj[key]`) et non sur `value` :
  // avec enableImplicitConversion, `value` arrive déjà converti et la chaîne
  // "false" y vaut `true` (bug attrapé par env.validation.spec.ts).
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
    const raw = obj[key];
    return raw === true || raw === 'true';
  })
  @IsBoolean()
  @IsOptional()
  WHATSAPP_ENABLED?: boolean = false;

  // Les WHATSAPP_* ci-dessous ne sont obligatoires que si le canal est allumé
  // — un environnement sans compte Meta (dev, CI) démarre normalement.
  @ValidateIf((env: EnvironmentVariables) => env.WHATSAPP_ENABLED === true)
  @IsString()
  WHATSAPP_PHONE_NUMBER_ID?: string;

  // Jeton permanent d'un utilisateur système Meta, droits WhatsApp seulement.
  @ValidateIf((env: EnvironmentVariables) => env.WHATSAPP_ENABLED === true)
  @IsString()
  WHATSAPP_ACCESS_TOKEN?: string;

  // Clé secrète de l'application Meta — vérifie X-Hub-Signature-256 (unité 44).
  @ValidateIf((env: EnvironmentVariables) => env.WHATSAPP_ENABLED === true)
  @IsString()
  WHATSAPP_APP_SECRET?: string;

  // Jeton choisi par l'équipe pour la poignée de main du webhook (unité 44).
  @ValidateIf((env: EnvironmentVariables) => env.WHATSAPP_ENABLED === true)
  @IsString()
  WHATSAPP_VERIFY_TOKEN?: string;

  // Version de l'API Graph figée (ex. v25.0) — jamais « la dernière » :
  // une montée de version Meta peut changer le format des réponses.
  @ValidateIf((env: EnvironmentVariables) => env.WHATSAPP_ENABLED === true)
  @Matches(/^v\d+\.\d+$/, { message: 'WHATSAPP_GRAPH_VERSION doit avoir la forme v23.0' })
  WHATSAPP_GRAPH_VERSION?: string;
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
