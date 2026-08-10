import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('affiche son contenu', () => {
    render(<Badge>Actif</Badge>);
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('applique les classes du ton demandé', () => {
    render(<Badge tone="error">Rejeté</Badge>);
    expect(screen.getByText('Rejeté').className).toContain('bg-red-100');
  });

  it('utilise le ton neutral par défaut', () => {
    render(<Badge>Défaut</Badge>);
    expect(screen.getByText('Défaut').className).toContain('bg-gray-100');
  });

  it('affiche un point quand dot est vrai', () => {
    render(<Badge dot>En ligne</Badge>);
    const badge = screen.getByText('En ligne');
    expect(badge.querySelector('span[aria-hidden="true"]')).not.toBeNull();
  });

  it("n'affiche pas de point par défaut", () => {
    render(<Badge>Hors ligne</Badge>);
    const badge = screen.getByText('Hors ligne');
    expect(badge.querySelector('span[aria-hidden="true"]')).toBeNull();
  });
});
