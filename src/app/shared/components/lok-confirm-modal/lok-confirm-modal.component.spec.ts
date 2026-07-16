import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LokConfirmModalComponent } from './lok-confirm-modal.component';

describe('LokConfirmModalComponent', () => {
  let component: LokConfirmModalComponent;
  let fixture: ComponentFixture<LokConfirmModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LokConfirmModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LokConfirmModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Valeurs par défaut ───────────────────────────────────────────

  describe('inputs par défaut', () => {
    it('titre par défaut est "Confirmer l\'action"', () => {
      expect(component.titre).toBe("Confirmer l'action");
    });

    it('message par défaut est défini', () => {
      expect(component.message).toBeTruthy();
    });

    it('confirmLabel par défaut est "Confirmer"', () => {
      expect(component.confirmLabel).toBe('Confirmer');
    });

    it('cancelLabel par défaut est "Annuler"', () => {
      expect(component.cancelLabel).toBe('Annuler');
    });

    it('detailMessage est undefined par défaut', () => {
      expect(component.detailMessage).toBeUndefined();
    });
  });

  // ── Inputs personnalisés ─────────────────────────────────────────

  describe('inputs personnalisés', () => {
    it('accepte un titre personnalisé', () => {
      component.titre = 'Supprimer le bien';
      fixture.detectChanges();
      const h3 = fixture.nativeElement.querySelector('h3');
      expect(h3.textContent.trim()).toBe('Supprimer le bien');
    });

    it('accepte un message personnalisé', () => {
      component.message = 'Cette action est irréversible.';
      fixture.detectChanges();
      const p = fixture.nativeElement.querySelectorAll('p')[0];
      expect(p.textContent.trim()).toBe('Cette action est irréversible.');
    });

    it('affiche detailMessage quand défini', () => {
      component.detailMessage = "L'historique sera conservé.";
      fixture.detectChanges();
      const paragraphes = fixture.nativeElement.querySelectorAll('p');
      const detail = Array.from(paragraphes).find((p: any) =>
        p.textContent.includes("L'historique sera conservé.")
      );
      expect(detail).toBeTruthy();
    });

    it('n\'affiche pas de paragraphe détail si detailMessage est undefined', () => {
      component.detailMessage = undefined;
      fixture.detectChanges();
      // Le template utilise @if(detailMessage), donc pas d'élément supplémentaire
      const paragraphes = fixture.nativeElement.querySelectorAll('p');
      expect(paragraphes.length).toBe(1); // seulement le message principal
    });
  });

  // ── Outputs : EventEmitters ──────────────────────────────────────

  describe('outputs', () => {
    it('onConfirm est un EventEmitter', () => {
      const spy = jest.spyOn(component.onConfirm, 'emit');
      component.onConfirm.emit();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('onCancel est un EventEmitter', () => {
      const spy = jest.spyOn(component.onCancel, 'emit');
      component.onCancel.emit();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Interactions DOM ─────────────────────────────────────────────

  describe('interactions DOM', () => {
    it('clic sur le bouton "Confirmer" émet onConfirm', () => {
      const spy = jest.spyOn(component.onConfirm, 'emit');
      const boutons = fixture.nativeElement.querySelectorAll('button');
      const boutonConfirm = boutons[boutons.length - 1];
      boutonConfirm.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('clic sur le bouton "Annuler" émet onCancel', () => {
      const spy = jest.spyOn(component.onCancel, 'emit');
      const boutons = fixture.nativeElement.querySelectorAll('button');
      const boutonAnnuler = boutons[0];
      boutonAnnuler.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('clic sur l\'overlay (fond sombre) émet onCancel', () => {
      const spy = jest.spyOn(component.onCancel, 'emit');
      // L'overlay est le premier div.fixed.inset-0 avec bg-black
      const overlay = fixture.nativeElement.querySelector('.bg-black');
      overlay.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('les labels des boutons correspondent aux inputs', () => {
      component.confirmLabel = 'Supprimer';
      component.cancelLabel = 'Garder';
      fixture.detectChanges();
      const boutons = fixture.nativeElement.querySelectorAll('button');
      expect(boutons[0].textContent.trim()).toBe('Garder');
      expect(boutons[1].textContent.trim()).toBe('Supprimer');
    });
  });
});
