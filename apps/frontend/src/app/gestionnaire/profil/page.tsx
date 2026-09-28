// Le profil personnel (identité, numéro de réception des loyers, notifications,
// mot de passe) est identique pour propriétaire et gestionnaire — même page,
// seulement servie sous l'espace gestionnaire pour rester dans son layout
// (RequireRole MANAGER + AppShell) au lieu de /dashboard, réservé aux
// propriétaires.
export { default } from '../../dashboard/profil/page';
