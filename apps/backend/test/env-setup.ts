// Exécuté par Jest (setupFiles) avant le chargement de tout fichier de test —
// donc avant que `import { AppModule } from '../src/app.module'` ne déclenche
// `ConfigModule.forRoot({ validate })`, qui s'exécute au moment même de
// l'évaluation du décorateur `@Module`, pas au démarrage de Nest. Sans ceci,
// la validation échoue avant même que testcontainers ait pu démarrer et
// renseigner DATABASE_URL/DIRECT_URL dans `beforeAll`.
//
// Valeurs jetables, jamais de vrais secrets : SupabaseAdminService est
// remplacé par un faux dans les specs e2e, et Resend/web-push ne sont pas
// exercés par ces scénarios. `??=` pour ne pas écraser un `.env` local déjà
// chargé. VAPID_PUBLIC_KEY/PRIVATE_KEY doivent rester un vrai couple de clés
// (format vérifié par la lib `web-push` dès la construction de
// WebPushService) — généré une fois via `npx web-push generate-vapid-keys`,
// sans lien avec la prod.
process.env['DATABASE_URL'] ??= 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
process.env['DIRECT_URL'] ??= 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
process.env['SUPABASE_URL'] ??= 'https://placeholder.supabase.co';
process.env['SUPABASE_ANON_KEY'] ??= 'placeholder-anon-key';
process.env['SUPABASE_SERVICE_ROLE_KEY'] ??= 'placeholder-service-role-key';
process.env['RESEND_API_KEY'] ??= 're_placeholder';
process.env['RESEND_FROM_EMAIL'] ??= 'noreply@warah.tg';
process.env['CONTACT_RECIPIENT_EMAIL'] ??= 'contact@warah.tg';
process.env['VAPID_PUBLIC_KEY'] ??=
  'BMPL5FAEGVZmuPw4HgG9RI6gETl6rmg2w-dyQ4huNFJX1xIq5vY8Ihvzd39ZMO8IzxU3qUUnnNFbyCtG21UjefQ';
process.env['VAPID_PRIVATE_KEY'] ??= 'nLMYh8CeJYviJNea4GWuyXZFIaXrb2lruNLDZF0ESmk';
process.env['VAPID_SUBJECT'] ??= 'mailto:contact@warah.tg';
process.env['FRONTEND_URL'] ??= 'https://placeholder.vercel.app';
process.env['INVITATION_TOKEN_SECRET'] ??= 'e2e-test-invitation-token-secret';
process.env['JWT_SECRET'] ??= 'e2e-test-jwt-secret';
