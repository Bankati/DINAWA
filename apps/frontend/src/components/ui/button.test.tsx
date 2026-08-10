import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('affiche son contenu', () => {
    render(<Button>Enregistrer</Button>);
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
  });

  it('déclenche onClick au clic', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Valider</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('se désactive et ignore les clics quand loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Envoyer</Button>);
    const button = screen.getByRole('button', { name: 'Envoyer' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('respecte disabled explicite même sans loading', () => {
    render(<Button disabled>Supprimer</Button>);
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeDisabled();
  });

  it('applique les classes de la variante demandée', () => {
    render(<Button variant="danger">Révoquer</Button>);
    expect(screen.getByRole('button', { name: 'Révoquer' }).className).toContain('bg-red-50');
  });
});
