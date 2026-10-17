import {
  MAX_TEMPLATE_PARAM_LENGTH,
  RETRYABLE_TEMPLATE_NAMES,
  WHATSAPP_TEMPLATES,
  WhatsappTemplateSpec,
  buildTemplate,
} from './whatsapp-templates';

// Contrat avec Meta (unité 46) : le texte publié chez Meta (metaText) et ce
// que le code envoie doivent avoir exactement les mêmes trous.
const placeholders = (text: string): number[] => [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));

const specs = Object.entries(WHATSAPP_TEMPLATES).filter((entry): entry is [string, WhatsappTemplateSpec] => entry[1] !== null);

describe('WHATSAPP_TEMPLATES — contrat avec Meta', () => {
  it('relie exactement les 3 événements prévus à leur modèle, rien d’autre', () => {
    expect(Object.fromEntries(specs.map(([event, spec]) => [event, spec.name]))).toEqual({
      'payment-reminder': 'rappel_loyer',
      receipt: 'paiement_recu',
      'tenant-overdue': 'loyer_en_retard',
    });
  });

  it.each(specs)('%s : autant de variables que de trous {{1}}..{{n}}, numérotés sans trou ni doublon', (_event, spec) => {
    const numbers = placeholders(spec.metaText);
    expect(numbers).toEqual(spec.body.map((_, i) => i + 1));
  });

  it('boutons, PDF et nouveaux essais déclarés par le modèle', () => {
    const byName = Object.fromEntries(specs.map(([, spec]) => [spec.name, spec]));
    expect(byName['rappel_loyer']).toMatchObject({ button: { variable: 'payToken' }, retry: true });
    expect(byName['loyer_en_retard']).toMatchObject({ button: { variable: 'payToken' }, retry: true });
    expect(byName['paiement_recu']).toMatchObject({ document: { filename: 'quittance-warah.pdf' }, retry: false });
    expect(byName['paiement_recu']?.button).toBeUndefined();
  });

  it('la quittance n’est jamais réessayée (PDF non stocké, décision 2)', () => {
    expect(RETRYABLE_TEMPLATE_NAMES).toEqual(['rappel_loyer', 'loyer_en_retard']);
  });

  it('aucun texte publicitaire : seulement du service', () => {
    for (const [, spec] of specs) expect(spec.metaText).not.toMatch(/promo|offre|réduction|publicit/i);
  });
});

describe('buildTemplate', () => {
  const reminder = WHATSAPP_TEMPLATES['payment-reminder'] as WhatsappTemplateSpec;
  const variables = {
    tenantFirstName: 'Ama',
    amount: 75000,
    propertyAddress: 'Bè, Lomé',
    dueDate: '2026-10-31',
    payToken: 'jeton',
  };

  it('range les variables nommées dans l’ordre du modèle et formate montant et date', () => {
    expect(buildTemplate(reminder, variables)).toEqual({
      ok: true,
      bodyParams: ['Ama', (75000).toLocaleString('fr-FR'), 'Bè, Lomé', '31/10/2026'],
      buttonParam: 'jeton',
    });
  });

  it('signale toute variable absente ou vide (Meta refuserait un paramètre vide)', () => {
    expect(buildTemplate(reminder, { ...variables, tenantFirstName: '  ', payToken: undefined as unknown as string })).toEqual({
      ok: false,
      missing: ['tenantFirstName', 'payToken'],
    });
  });

  it('retours à la ligne, tabulations et suites d’espaces → un espace simple (refusés par Meta)', () => {
    const built = buildTemplate(reminder, { ...variables, propertyAddress: '12 rue des Cocotiers\n\tBè,      Lomé  ' });
    expect(built).toMatchObject({ ok: true });
    if (built.ok) expect(built.bodyParams[2]).toBe('12 rue des Cocotiers Bè, Lomé');
  });

  it('valeur trop longue coupée avec « … » (limite prudente)', () => {
    const built = buildTemplate(reminder, { ...variables, propertyAddress: 'a'.repeat(500) });
    if (!built.ok) throw new Error('attendu : modèle rempli');
    expect(built.bodyParams[2]).toHaveLength(MAX_TEMPLATE_PARAM_LENGTH);
    expect(built.bodyParams[2].endsWith('…')).toBe(true);
  });

  it('modèle sans bouton : pas de buttonParam', () => {
    const receipt = WHATSAPP_TEMPLATES.receipt as WhatsappTemplateSpec;
    expect(buildTemplate(receipt, { tenantFirstName: 'Ama', amount: 1000, period: 'octobre' })).toEqual({
      ok: true,
      bodyParams: ['Ama', (1000).toLocaleString('fr-FR'), 'octobre'],
    });
  });
});
