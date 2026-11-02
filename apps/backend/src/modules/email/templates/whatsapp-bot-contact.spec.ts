import * as leaseCreated from './lease-created.template';
import * as tenantInvitation from './tenant-invitation.template';
import { formatWhatsappNumber, renderWhatsappBotParagraph } from './whatsapp-bot-contact';

const ROBOT_PARAGRAPH =
  '<p>Enregistrez aussi le numéro WhatsApp de WARAH : <strong>+228 99 32 73 12</strong>. ' +
  'Écrivez-lui pour activer votre assistant WhatsApp (payer votre loyer, recevoir vos quittances) : ' +
  '<a href="https://wa.me/22899327312">https://wa.me/22899327312</a></p>';

describe('formatWhatsappNumber', () => {
  it('affiche un numéro togolais par paires', () => {
    expect(formatWhatsappNumber('22899327312')).toBe('+228 99 32 73 12');
  });

  it('laisse un numéro hors Togo en « +chiffres »', () => {
    expect(formatWhatsappNumber('15551234567')).toBe('+15551234567');
  });
});

describe('renderWhatsappBotParagraph', () => {
  it('rend le numéro lisible et un lien wa.me cliquable', () => {
    expect(renderWhatsappBotParagraph({ whatsappBotNumber: '22899327312' })).toBe(ROBOT_PARAGRAPH);
  });

  it('ne rend rien sans numéro', () => {
    expect(renderWhatsappBotParagraph({})).toBe('');
    expect(renderWhatsappBotParagraph({ whatsappBotNumber: '' })).toBe('');
  });

  it('ne garde que les chiffres (aucune injection HTML possible)', () => {
    const html = renderWhatsappBotParagraph({ whatsappBotNumber: '228"><script>99327312' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('https://wa.me/22899327312');
  });
});

describe('email lease-created (invitation du locataire)', () => {
  const base = {
    propertyAddress: '12 rue de Lomé',
    ownerName: 'Jean Dupont',
    startDate: '01/01/2026',
    monthlyAmount: 55000,
    invitationUrl: 'https://warah.tg/auth/activate?token=abc',
  };

  it('ajoute le paragraphe du robot quand le numéro est fourni', () => {
    const html = leaseCreated.render({ ...base, whatsappBotNumber: '22899327312' });
    expect(html).toContain(ROBOT_PARAGRAPH);
    expect(html).toContain('Créer mon compte');
  });

  it('reste inchangé sans numéro', () => {
    const html = leaseCreated.render(base);
    expect(html).not.toContain('wa.me');
    expect(html).not.toContain('WhatsApp');
    expect(html).toContain('Créer mon compte');
  });
});

describe('email tenant-invitation', () => {
  const base = {
    inviterName: 'Jean Dupont',
    propertyAddress: '12 rue de Lomé',
    invitationUrl: 'https://warah.tg/auth/activate?token=abc',
  };

  it('ajoute le paragraphe du robot quand le numéro est fourni', () => {
    expect(tenantInvitation.render({ ...base, whatsappBotNumber: '22899327312' })).toContain(
      ROBOT_PARAGRAPH,
    );
  });

  it('reste inchangé sans numéro', () => {
    expect(tenantInvitation.render(base)).not.toContain('wa.me');
  });
});
