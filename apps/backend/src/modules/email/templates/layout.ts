// Habillage HTML partagé par tous les templates — wordmark WARAH en texte
// stylé (pas d'image) pour éviter toute dépendance à un logo hébergé et
// rester fiable même quand un client email bloque les images distantes.
// Bandeau restylé (2026-08-11) pour reprendre le même dégradé bleu marine
// que les sections sombres du site (navbar/stats/footer, voir CLAUDE.md) —
// alignement gauche et typo sans-serif, sur le même principe de mise en
// page qu'une référence de bandeau d'en-tête fournie par le développeur.

const BRAND_NAVY = '#13284A';
const BRAND_NAVY_GRADIENT = 'linear-gradient(135deg, #0A2650 0%, #0F4C81 60%, #081E41 100%)';
const BRAND_GOLD = '#C9A227';
const BACKGROUND = '#F4F6F9';
const TEXT = '#333333';
const MUTED = '#6B7280';

export type LayoutOptions = {
  preheader?: string;
};

export function renderLayout(bodyHtml: string, options: LayoutOptions = {}): string {
  const preheader = options.preheader ?? '';
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WARAH</title>
  </head>
  <body style="margin:0;padding:0;background-color:${BACKGROUND};font-family:Arial,Helvetica,sans-serif;">
    <span style="display:none;font-size:1px;color:${BACKGROUND};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BACKGROUND};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td
                bgcolor="#0A2650"
                style="background-color:#0A2650;background-image:${BRAND_NAVY_GRADIENT};padding:32px 32px;"
                align="left"
              >
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;color:#ffffff;">
                  WARAH
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.5px;color:#D9C48A;text-transform:uppercase;margin-top:6px;">
                  La gestion locative intelligente
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;color:${TEXT};font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:${BACKGROUND};padding:20px 32px;border-top:1px solid #E5E7EB;">
                <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.5;">
                  WARAH — La gestion locative intelligente, pour propriétaires et gestionnaires au Togo.<br />
                  Vous recevez cet email suite à une action sur votre compte WARAH. Besoin d'aide ? Répondez simplement à cet email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:${BRAND_NAVY};border-radius:6px;">
        <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function renderAmountBox(label: string, amountFcfa: number | string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:${BACKGROUND};border-left:4px solid ${BRAND_GOLD};border-radius:4px;">
    <tr>
      <td style="padding:16px 20px;">
        <div style="font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
        <div style="font-size:24px;font-weight:bold;color:${BRAND_NAVY};margin-top:4px;">${formatFcfa(amountFcfa)}</div>
      </td>
    </tr>
  </table>`;
}

function formatFcfa(amount: number | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return `${String(amount)} FCFA`;
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

// Toute valeur qui provient d'un utilisateur (nom, message, adresse) passe
// par ici avant interpolation dans le HTML — jamais concaténée brute.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
