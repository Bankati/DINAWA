import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './modal';

describe('Modal', () => {
  it("ne rend rien quand open est faux", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Titre">
        Contenu
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('affiche le titre et le contenu quand open est vrai', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirmation">
        Êtes-vous sûr ?
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmation')).toBeInTheDocument();
    expect(screen.getByText('Êtes-vous sûr ?')).toBeInTheDocument();
  });

  it('appelle onClose au clic sur le bouton fermer', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        Contenu
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('appelle onClose au clic sur le fond (overlay)', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        Contenu
      </Modal>,
    );
    await userEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ne ferme pas au clic à l’intérieur du panneau', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        Contenu du panneau
      </Modal>,
    );
    await userEvent.click(screen.getByText('Contenu du panneau'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('appelle onClose sur la touche Échap', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titre">
        Contenu
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
