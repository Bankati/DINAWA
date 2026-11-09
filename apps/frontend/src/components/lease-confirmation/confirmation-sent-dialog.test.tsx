import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn() } };
});

import { api } from '@/lib/api';
import { ConfirmationSentDialog, InviteConfirmationNote, type ConfirmationSentInfo } from './confirmation-sent-dialog';

const SENT: ConfirmationSentInfo = {
  confirmationId: 'awa',
  tenantDisplayName: 'Awa Mensah',
  property: { address: 'Villa rue 12', neighborhood: 'Adidogomé', city: 'Lomé' },
  monthlyRent: 50000,
  startDate: '2026-12-01',
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('InviteConfirmationNote (écran A1)', () => {
  it('annonce la confirmation sans rien vérifier pendant la saisie', () => {
    render(<InviteConfirmationNote />);
    expect(
      screen.getByText("Si cette personne a déjà un compte WARAH, nous lui demanderons de confirmer avant d'activer le bail."),
    ).toBeInTheDocument();
  });
});

describe('ConfirmationSentDialog (écran A2)', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("n'affiche rien sans demande envoyée", () => {
    vi.mocked(api.get).mockResolvedValue([]);
    render(<ConfirmationSentDialog sent={null} onClose={vi.fn()} />, { wrapper });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('utilise le nom tapé, sans genre supposé, et les dates du serveur', async () => {
    vi.mocked(api.get).mockResolvedValue([
      {
        id: 'awa',
        status: 'PENDING',
        nextReminderAt: '2026-11-11T14:33:00.000Z',
        expiresAt: '2026-11-16T14:33:00.000Z',
      },
    ]);
    render(<ConfirmationSentDialog sent={SENT} onClose={vi.fn()} />, { wrapper });

    const dialog = await screen.findByRole('dialog', { name: 'Demande de confirmation envoyée' });
    expect(within(dialog).getByText(/Awa Mensah a déjà un compte WARAH\. Nous lui demandons de confirmer\. Le bail sera actif dès qu'Awa accepte\./)).toBeInTheDocument();
    expect(within(dialog).getByText(/Par email et dans son espace WARAH, et aussi par WhatsApp si Awa l'a activé/)).toBeInTheDocument();
    expect(await within(dialog).findByText(/prochain le 11\/11/)).toBeInTheDocument();
    expect(within(dialog).getByText(/la demande expire le 16\/11\/2026/)).toBeInTheDocument();
    expect(within(dialog).getByText(/aucun rappel de loyer, aucun lien de paiement/)).toBeInTheDocument();
    // Pas de lien d'invitation à copier : WARAH s'en charge.
    expect(within(dialog).queryByRole('button', { name: 'Copier' })).not.toBeInTheDocument();
  });

  it('affiche la règle générale tant que les dates ne sont pas chargées, et se ferme avec « Compris »', async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const onClose = vi.fn();
    render(<ConfirmationSentDialog sent={{ ...SENT, tenantDisplayName: 'Kossi Amegan' }} onClose={onClose} />, { wrapper });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/dès que Kossi accepte/)).toBeInTheDocument();
    expect(within(dialog).getByText(/expire au bout de 7 jours/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Compris' }));
    expect(onClose).toHaveBeenCalled();
  });
});
