import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api";
import type { PayLinkView } from "@/lib/pay-links";

const { getPayLink, initiatePayLink } = vi.hoisted(() => ({
  getPayLink: vi.fn(),
  initiatePayLink: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "jeton-test" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/pay-links", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/pay-links")>();
  return {
    ...original,
    getPayLink: (...args: unknown[]) => getPayLink(...args),
    initiatePayLink: (...args: unknown[]) => initiatePayLink(...args),
  };
});

import PayerPage from "../[token]/page";
import PayerMerciPage from "../[token]/merci/page";

const VIEW: PayLinkView = {
  status: "PAYABLE",
  paymentInProgress: false,
  tenantFirstName: "Afi",
  propertyType: "APARTMENT",
  building: null,
  neighborhood: "Bè",
  city: "Lomé",
  periodStart: "2026-10-01T00:00:00.000Z",
  periodEnd: "2026-10-31T00:00:00.000Z",
  dueDate: "2026-10-05T00:00:00.000Z",
  rentAmount: 50000,
  feeAmount: 500,
  totalAmount: 50500,
  expiresAt: "2026-11-04T00:00:00.000Z",
};

// Laisse se résoudre les promesses en attente (fetch simulé) sous minuteries simulées.
async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  getPayLink.mockReset();
  initiatePayLink.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("page /payer/[token] — erreurs de chargement", () => {
  it("affiche « Ce lien a expiré » sans bouton Réessayer (400 actuel du serveur)", async () => {
    getPayLink.mockRejectedValue(new ApiError(400, { message: "Lien expiré, demandez-en un nouveau" }));
    render(<PayerPage />);
    await flush();

    expect(screen.getByRole("heading", { name: "Ce lien a expiré" })).toBeInTheDocument();
    expect(screen.getByText(/Contactez votre agence pour le régler/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Réessayer/ })).not.toBeInTheDocument();
  });

  it("affiche aussi l'état expiré pour un futur 410", async () => {
    getPayLink.mockRejectedValue(new ApiError(410, null));
    render(<PayerPage />);
    await flush();

    expect(screen.getByRole("heading", { name: "Ce lien a expiré" })).toBeInTheDocument();
  });

  it("n'offre pas Réessayer pour un lien non valide", async () => {
    getPayLink.mockRejectedValue(new ApiError(404, { message: "Lien invalide" }));
    render(<PayerPage />);
    await flush();

    expect(screen.getByRole("heading", { name: "Lien non valide" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Réessayer/ })).not.toBeInTheDocument();
  });

  it("propose Réessayer après une coupure réseau, et recharge au clic", async () => {
    getPayLink.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(VIEW);
    render(<PayerPage />);
    await flush();

    fireEvent.click(screen.getByRole("button", { name: /Réessayer/ }));
    await flush();

    expect(getPayLink).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "Loyer de Afi" })).toBeInTheDocument();
  });

  it("prévient d'une connexion lente après 15 s de chargement", async () => {
    getPayLink.mockReturnValue(new Promise(() => {}));
    render(<PayerPage />);

    await act(async () => {
      vi.advanceTimersByTime(14_000);
    });
    expect(screen.queryByText(/La connexion est lente/)).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1_500);
    });
    expect(screen.getByText(/La connexion est lente/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Réessayer/ }));
    expect(getPayLink).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/La connexion est lente/)).not.toBeInTheDocument();
  });
});

describe("page /payer/[token] — bouton Payer", () => {
  it("affiche « Ouverture de la page de paiement… » avec aria-busy pendant l'attente", async () => {
    getPayLink.mockResolvedValue(VIEW);
    initiatePayLink.mockReturnValue(new Promise(() => {}));
    render(<PayerPage />);
    await flush();

    fireEvent.click(screen.getByRole("button", { name: /avec Flooz/ }));

    const busy = screen.getByRole("button", { name: /Ouverture de la page de paiement/ });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toBeDisabled();
  });

  it("débloque les boutons au retour arrière (pageshow persisted)", async () => {
    getPayLink.mockResolvedValue(VIEW);
    initiatePayLink.mockReturnValue(new Promise(() => {}));
    render(<PayerPage />);
    await flush();

    fireEvent.click(screen.getByRole("button", { name: /avec Flooz/ }));
    expect(screen.getByRole("button", { name: /avec Mixx by Yas/ })).toBeDisabled();

    act(() => {
      const event = new Event("pageshow") as PageTransitionEvent;
      Object.defineProperty(event, "persisted", { value: true });
      window.dispatchEvent(event);
    });

    expect(screen.getByRole("button", { name: /avec Flooz/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /avec Mixx by Yas/ })).toBeEnabled();
  });

  it("prévient d'une ouverture lente du paiement après 15 s et permet de réessayer", async () => {
    getPayLink.mockResolvedValue(VIEW);
    initiatePayLink.mockReturnValue(new Promise(() => {}));
    render(<PayerPage />);
    await flush();

    fireEvent.click(screen.getByRole("button", { name: /avec Flooz/ }));
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });

    expect(screen.getByText(/La connexion est lente/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Réessayer/ }));
    expect(initiatePayLink).toHaveBeenCalledTimes(2);
    expect(initiatePayLink).toHaveBeenLastCalledWith("jeton-test", "FLOOZ");
  });
});

describe("page /payer/[token]/merci", () => {
  it("propose « Vérifier à nouveau » et le retour au paiement quand les vérifications sont finies", async () => {
    getPayLink.mockResolvedValue(VIEW);
    render(<PayerMerciPage />);
    await flush();

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        vi.advanceTimersByTime(5_000);
      });
      await flush();
    }

    expect(getPayLink).toHaveBeenCalledTimes(6);
    expect(screen.getByRole("heading", { name: "Paiement pas encore confirmé" })).toBeInTheDocument();
    expect(screen.getByText(/inutile de payer à nouveau : la confirmation peut prendre jusqu'à 15 minutes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revenir à la page de paiement" })).toHaveAttribute(
      "href",
      "/payer/jeton-test",
    );

    getPayLink.mockResolvedValue({ ...VIEW, status: "PAID" });
    fireEvent.click(screen.getByRole("button", { name: /Vérifier à nouveau/ }));
    await flush();

    expect(getPayLink).toHaveBeenCalledTimes(7);
    expect(screen.getByRole("heading", { name: "Paiement confirmé" })).toBeInTheDocument();
  });

  it("ne garde pas le titre « Merci ! » quand la vérification échoue (coupure)", async () => {
    getPayLink.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<PayerMerciPage />);
    await flush();

    expect(screen.getByRole("heading", { name: "Vérification impossible" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vérifier à nouveau/ })).toBeInTheDocument();
  });
});
