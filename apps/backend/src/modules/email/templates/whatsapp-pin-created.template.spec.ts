import { render, subject } from './whatsapp-pin-created.template';

describe('email « code WhatsApp créé » (unité 50)', () => {
  it('dit qui et pour quel bien, explique quoi faire si ce n’est pas le locataire', () => {
    const html = render({ tenantName: 'Ama Mensah', propertyAddress: 'Bè, Lomé' });
    expect(subject()).toBe('Un locataire a créé son code WhatsApp');
    expect(html).toContain('Ama Mensah');
    expect(html).toContain('Bè, Lomé');
    expect(html).toContain('changez son numéro');
  });

  it('échappe les valeurs (nom saisi par un utilisateur)', () => {
    const html = render({ tenantName: '<script>x</script>', propertyAddress: 'Bè' });
    expect(html).not.toContain('<script>x</script>');
  });
});
