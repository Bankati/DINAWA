import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '@/lib/api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn() } };
});

import { api } from '@/lib/api';
import type { LeaseConfirmation } from '@/lib/lease-confirmations';
import { ConfirmationRequestsSection, type ConfirmationRequestsSectionProps } from './confirmation-requests-section';
import { resendBody } from './resend-confirmation-dialog';

function confirmation(overrides: Partial<LeaseConfirmation>): LeaseConfirmation {
  return {
    id: 'c1',
    status: 'PENDING',
    tenantDisplayName: 'Awa Mensah',
    phone: '90 12 34 56',
    email: 'awa.mensah@exemple.com',
    lease: {
      id: 'l1',
      monthlyRent: 50000,
      startDate: '2026-12-01T00:00:00.000Z',
      property: { id: 'p1', address: 'Villa rue 12', neighborhood: 'Adidogomé', city: 'Lomé' },
    },
    sentAt: '2026-11-09T14:33:00.000Z',
    remindersSentAt: [],
    nextReminderAt: '2026-11-11T14:33:00.000Z',
    expiresAt: '2026-11-16T14:33:00.000Z',
    respondedAt: null,
    refusalCount: 0,
    canResend: true,
    ...overrides,
  };
}

const AWA = confirmation({ id: 'awa' });
const KOSSI = confirmation({
  id: 'kossi',
  status: 'REFUSED',
  tenantDisplayName: 'Kossi Amegan',
  phone: '91 00 11 22',
  email: 'kossi.amegan@exemple.com',
  refusalCount: 1,
  nextReminderAt: null,
  respondedAt: '2026-11-09T15:00:00.000Z',
  lease: {
    id: 'l2',
    monthlyRent: 35000,
    startDate: '2026-12-01T00:00:00.000Z',
    property: { id: 'p2', address: 'Appartement B2', neighborhood: 'Bè Kpota', city: 'Lomé' },
  },
});
const ESI = confirmation({
  id: 'esi',
  status: 'EXPIRED',
  tenantDisplayName: 'Esi Lawson',
  nextReminderAt: null,
  lease: {
    id: 'l3',
    monthlyRent: 25000,
    startDate: '2026-12-01T00:00:00.000Z',
    property: { id: 'p3', address: 'Studio 4', neighborhood: 'Agoè', city: 'Lomé' },
  },
});
const YAWO = confirmation({
  id: 'yawo',
  status: 'REFUSED',
  tenantDisplayName: 'Yawo Kpodar',
  refusalCount: 3,
  canResend: false,
  nextReminderAt: null,
});
const ACCEPTED = confirmation({ id: 'ok', status: 'ACCEPTED', tenantDisplayName: 'Afi Tsogbe' });

function renderSection(list: LeaseConfirmation[], props: ConfirmationRequestsSectionProps = {}) {
  vi.mocked(api.get).mockResolvedValue(list);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return render(<ConfirmationRequestsSection {...props} />, { wrapper });
}

async function cardOf(name: string) {
  const title = await screen.findByText(name);
  return title.closest('li') as HTMLElement;
}

describe('ConfirmationRequestsSection (écran B1)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it('ne montre pas le bloc sans demande à suivre (les acceptées sont dans la liste des locataires)', async () => {
    renderSection([ACCEPTED]);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/lease-confirmations'));
    expect(screen.queryByText('Demandes de confirmation')).not.toBeInTheDocument();
  });

  it('affiche les 4 états, chacun avec un texte (jamais la couleur seule)', async () => {
    renderSection([AWA, KOSSI, ESI, YAWO, ACCEPTED]);

    expect(await screen.findByRole('region', { name: 'Demandes de confirmation' })).toBeInTheDocument();
    expect(screen.queryByText('Afi Tsogbe')).not.toBeInTheDocument();

    const awa = await cardOf('Awa Mensah');
    expect(within(awa).getByText('En attente de confirmation')).toBeInTheDocument();
    expect(within(awa).getByText(/Envoyée le 09\/11 · rappel le 11\/11 · expire le 16\/11/)).toBeInTheDocument();
    expect(within(awa).getByRole('button', { name: /voir la demande/i })).toBeInTheDocument();

    const kossi = await cardOf('Kossi Amegan');
    expect(within(kossi).getByText('Refusé')).toBeInTheDocument();
    expect(within(kossi).getByText(/Kossi n'a pas confirmé, vérifiez le numéro/)).toBeInTheDocument();
    expect(within(kossi).getByText('1 refus sur 3')).toBeInTheDocument();
    expect(within(kossi).getByRole('button', { name: 'Vérifier le numéro et renvoyer' })).toBeEnabled();

    const esi = await cardOf('Esi Lawson');
    expect(within(esi).getByText('Demande expirée')).toBeInTheDocument();
    expect(within(esi).getByText(/L'annonce du bien est de nouveau en ligne/)).toBeInTheDocument();
    expect(within(esi).getByRole('button', { name: 'Renvoyer la demande' })).toBeEnabled();

    const yawo = await cardOf('Yawo Kpodar');
    expect(within(yawo).getByText('Refusé 3 fois')).toBeInTheDocument();
    expect(within(yawo).getByText(/le renvoi n'est plus possible/)).toBeInTheDocument();
    expect(within(yawo).getByRole('button', { name: 'Renvoi impossible' })).toBeDisabled();
  });

  it("affiche une erreur visible avec « Réessayer » si la liste ne charge pas", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce([AWA]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ConfirmationRequestsSection />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent("Les demandes de confirmation n'ont pas pu être chargées.");
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText('Awa Mensah')).toBeInTheDocument();
  });

  it('B2 : la fiche « En attente » montre le suivi et permet d’annuler la demande', async () => {
    vi.mocked(api.post).mockResolvedValue({});
    renderSection([confirmation({ id: 'awa', remindersSentAt: ['2026-11-11T14:33:00.000Z'], nextReminderAt: '2026-11-14T14:33:00.000Z' })]);

    await userEvent.click(await screen.findByRole('button', { name: /voir la demande/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Demande — Awa Mensah' });
    expect(within(dialog).getByText('Demande envoyée le 09/11')).toBeInTheDocument();
    expect(within(dialog).getByText('1er rappel envoyé le 11/11')).toBeInTheDocument();
    expect(within(dialog).getByText('2e rappel prévu le 14/11')).toBeInTheDocument();
    expect(within(dialog).getByText('Expire le 16/11 sans réponse')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Renvoyer' })).toBeDisabled();
    expect(within(dialog).getByText('Le renvoi sera possible si la demande expire (16/11).')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Annuler la demande' }));
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Oui, annuler la demande' }));

    expect(api.post).toHaveBeenCalledWith('/lease-confirmations/awa/cancel', {});
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('La demande à Awa Mensah a été annulée.')).toBeInTheDocument();
  });

  it('B2 : en lecture seule (bien sous mandat), pas de bouton Annuler', async () => {
    renderSection([AWA], { isReadOnly: () => true });

    await userEvent.click(await screen.findByRole('button', { name: /voir la demande/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Annuler la demande' })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/seul le gestionnaire peut annuler ou renvoyer/)).toBeInTheDocument();
  });

  it('B3 : vérifier et renvoyer avec le numéro corrigé', async () => {
    vi.mocked(api.post).mockResolvedValue({ id: 'kossi', status: 'PENDING' });
    renderSection([KOSSI]);

    await userEvent.click(await screen.findByRole('button', { name: 'Vérifier le numéro et renvoyer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Vérifier et renvoyer' });
    expect(within(dialog).getByText(/La personne qui a reçu la demande a répondu « Ce n'est pas moi »/)).toBeInTheDocument();
    expect(within(dialog).getByText(/1 refus sur 3\./)).toBeInTheDocument();

    const phone = within(dialog).getByLabelText(/Téléphone/);
    expect(phone).toHaveValue('91 00 11 22');
    await userEvent.clear(phone);
    await userEvent.type(phone, '91 00 11 23');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Renvoyer' }));

    expect(api.post).toHaveBeenCalledWith('/lease-confirmations/kossi/resend', { phone: '91 00 11 23' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('La demande a été renvoyée à Kossi Amegan.')).toBeInTheDocument();
  });

  it("B3 : pendant l'envoi le bouton est désactivé, puis l'échec s'affiche", async () => {
    let fail!: (e: unknown) => void;
    vi.mocked(api.post).mockReturnValue(new Promise((_, reject) => { fail = reject; }) as Promise<never>);
    renderSection([ESI]);

    await userEvent.click(await screen.findByRole('button', { name: 'Renvoyer la demande' }));
    const dialog = await screen.findByRole('dialog', { name: 'Vérifier et renvoyer' });
    expect(within(dialog).getByText(/Esi n'a pas répondu en 7 jours/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Renvoyer' }));

    const busy = within(dialog).getByRole('button', { name: /envoi en cours/i });
    expect(busy).toBeDisabled();
    await userEvent.click(busy);
    expect(api.post).toHaveBeenCalledTimes(1);

    fail(new TypeError('Failed to fetch'));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "L'envoi n'a pas abouti. Vérifiez votre connexion, puis appuyez de nouveau sur « Renvoyer ».",
    );
    expect(within(dialog).getByRole('button', { name: 'Renvoyer' })).toBeEnabled();
  });

  it('B3 : un contact sans compte redevient une invitation classique (lien à transmettre)', async () => {
    const onInvitationFallback = vi.fn();
    vi.mocked(api.post).mockResolvedValue({ invitationUrl: 'https://warah.tg/auth/activate?t=1', whatsappBotNumber: null });
    renderSection([KOSSI], { onInvitationFallback });

    await userEvent.click(await screen.findByRole('button', { name: 'Vérifier le numéro et renvoyer' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Renvoyer' }));

    await waitFor(() =>
      expect(onInvitationFallback).toHaveBeenCalledWith({
        invitationUrl: 'https://warah.tg/auth/activate?t=1',
        phone: '91 00 11 22',
        firstName: 'Kossi',
        whatsappBotNumber: null,
      }),
    );
  });

  it('B3 : la demande ne peut plus être renvoyée (409) — message clair et liste rechargée', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(409, { message: 'conflict' }));
    renderSection([KOSSI]);

    await userEvent.click(await screen.findByRole('button', { name: 'Vérifier le numéro et renvoyer' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Renvoyer' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Cette demande ne peut plus être renvoyée.');
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});

describe('resendBody', () => {
  it("n'envoie que les champs corrigés", () => {
    expect(resendBody({ phone: '91001122', email: 'a@b.tg' }, '91001122', 'a@b.tg')).toEqual({});
    expect(resendBody({ phone: '91001122', email: 'a@b.tg' }, ' 91001123 ', 'a@b.tg')).toEqual({ phone: '91001123' });
    expect(resendBody({ phone: null, email: null }, '91001122', 'c@d.tg')).toEqual({ phone: '91001122', email: 'c@d.tg' });
  });
});
