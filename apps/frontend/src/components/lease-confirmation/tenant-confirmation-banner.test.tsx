import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '@/lib/api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn() } };
});

import { api } from '@/lib/api';
import type { MyLeaseConfirmation } from '@/lib/lease-confirmations';
import { TenantConfirmationBanner } from './tenant-confirmation-banner';

const REQUEST: MyLeaseConfirmation = {
  id: 'lc1',
  inviterDisplayName: 'Jean Dupont',
  lease: {
    monthlyRent: 50000,
    startDate: '2026-12-01T00:00:00.000Z',
    property: { address: 'Villa rue 12', neighborhood: 'Adidogomé', city: 'Lomé' },
  },
  expiresAt: '2026-11-16T14:33:00.000Z',
};

function renderBanner(confirmations: MyLeaseConfirmation[] = [REQUEST]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return render(<TenantConfirmationBanner confirmations={confirmations} />, { wrapper });
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const yesButton = () => screen.getByRole('button', { name: /oui, c'est mon logement/i });
const notMeButton = () => screen.getByRole('button', { name: /ce n'est pas moi/i });

describe('TenantConfirmationBanner (écran D)', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockReset().mockResolvedValue([]);
  });

  it("n'affiche rien sans demande en attente", () => {
    const { container } = renderBanner([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('montre la demande avec le nom de la personne qui invite, le bien, le loyer et les dates', () => {
    renderBanner();
    expect(screen.getByRole('heading', { name: 'Jean Dupont vous ajoute comme locataire' })).toBeInTheDocument();
    expect(screen.getByText('Villa rue 12')).toBeInTheDocument();
    expect(screen.getByText('50 000 FCFA')).toBeInTheDocument();
    expect(screen.getByText('À partir du 01/12/2026')).toBeInTheDocument();
    expect(screen.getByText('Expire le 16/11/2026')).toBeInTheDocument();
    expect(screen.getByText(/Vous ne connaissez pas Jean Dupont/)).toBeInTheDocument();
  });

  it('désactive les deux boutons pendant l’envoi et n’envoie qu’une seule réponse', async () => {
    const pending = deferred<unknown>();
    vi.mocked(api.post).mockReturnValue(pending.promise as Promise<never>);
    renderBanner();

    await userEvent.click(yesButton());

    expect(screen.getByRole('button', { name: /confirmation en cours/i })).toBeDisabled();
    expect(notMeButton()).toBeDisabled();
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toContain('Confirmation en cours…');
    await userEvent.click(screen.getByRole('button', { name: /confirmation en cours/i }));
    expect(api.post).toHaveBeenCalledTimes(1);

    pending.resolve({ status: 'ACCEPTED', leaseId: 'l1' });
    expect(await screen.findByRole('heading', { name: "C'est confirmé !" })).toBeInTheDocument();
  });

  it('après « Oui » : écran E1 avec le bail actif et le premier loyer (E1)', async () => {
    vi.mocked(api.post).mockResolvedValue({ status: 'ACCEPTED', leaseId: 'l1' });
    renderBanner();

    await userEvent.click(yesButton());

    expect(api.post).toHaveBeenCalledWith('/me/lease-confirmations/lc1/accept', {});
    const heading = await screen.findByRole('heading', { name: "C'est confirmé !" });
    expect(heading).toHaveFocus();
    expect(screen.getByText('Votre bail est actif. Nous avons prévenu Jean Dupont.')).toBeInTheDocument();
    expect(screen.getByText('Premier loyer le 01/12/2026')).toBeInTheDocument();
    expect(screen.queryByText('Est-ce bien votre logement ?')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Voir mon tableau de bord' }));
    expect(screen.queryByRole('heading', { name: "C'est confirmé !" })).not.toBeInTheDocument();
  });

  it('après « Ce n’est pas moi » : écran E2 rassurant (E2)', async () => {
    vi.mocked(api.post).mockResolvedValue({ status: 'REFUSED' });
    renderBanner();

    await userEvent.click(notMeButton());

    expect(api.post).toHaveBeenCalledWith('/me/lease-confirmations/lc1/refuse', {});
    expect(await screen.findByRole('heading', { name: "C'est noté, merci" })).toBeInTheDocument();
    expect(screen.getByText(/Nous avons demandé à Jean Dupont de vérifier le numéro/)).toBeInTheDocument();
    expect(screen.getByText(/Demandez à Jean Dupont de vous renvoyer la demande/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retour à mon tableau de bord' })).toBeInTheDocument();
  });

  it('bail actif ailleurs (409 ACTIVE_LEASE_EXISTS) : message du boss, la demande reste ouverte', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(409, { code: 'ACTIVE_LEASE_EXISTS' }));
    renderBanner();

    await userEvent.click(yesButton());

    expect(await screen.findByRole('alert')).toHaveTextContent("Votre bail actuel doit d'abord être terminé par votre propriétaire.");
    expect(yesButton()).toBeEnabled();
    expect(notMeButton()).toBeEnabled();
  });

  it('demande expirée (410) : rien n’a changé, sans erreur technique', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(410, { message: 'Gone' }));
    renderBanner();

    await userEvent.click(yesButton());

    expect(await screen.findByRole('heading', { name: "Cette demande n'est plus en cours" })).toBeInTheDocument();
    expect(screen.getByText("Rien n'a changé sur votre compte.")).toBeInTheDocument();
    expect(screen.queryByText(/Gone/)).not.toBeInTheDocument();
  });

  it('déjà répondu ailleurs (WhatsApp) : rien d’autre à faire', async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(404, null));
    renderBanner();

    await userEvent.click(notMeButton());

    expect(await screen.findByRole('heading', { name: 'Vous avez déjà répondu à cette demande' })).toBeInTheDocument();
  });

  it("échec d'envoi : message clair et nouvel essai possible", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ status: 'ACCEPTED', leaseId: 'l1' });
    renderBanner();

    await userEvent.click(yesButton());
    expect(await screen.findByRole('alert')).toHaveTextContent("Votre réponse n'est pas partie. Vérifiez votre connexion, puis appuyez de nouveau.");

    await userEvent.click(yesButton());
    await waitFor(() => expect(screen.getByRole('heading', { name: "C'est confirmé !" })).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('boutons de 48 px au moins', () => {
    renderBanner();
    expect(yesButton().className).toContain('min-h-12');
    expect(notMeButton().className).toContain('min-h-12');
  });
});
