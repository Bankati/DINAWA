import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'lok-confirm-modal',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Overlay -->
      <div 
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        (click)="onCancel.emit()"
      ></div>

      <!-- Modal -->
      <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 transform transition-all">
        <!-- Icône d'avertissement -->
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>

        <!-- Titre -->
        <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">
          {{ titre }}
        </h3>

        <!-- Message -->
        <p class="text-sm text-gray-600 text-center mb-6">
          {{ message }}
        </p>

        <!-- Boutons -->
        <div class="flex gap-3">
          <button 
            (click)="onCancel.emit()"
            class="flex-1 btn-secondary"
          >
            {{ cancelLabel }}
          </button>
          <button 
            (click)="onConfirm.emit()"
            class="flex-1 btn-danger"
          >
            {{ confirmLabel }}
          </button>
        </div>

        @if (detailMessage) {
          <p class="text-xs text-gray-500 text-center mt-4">
            {{ detailMessage }}
          </p>
        }
      </div>
    </div>
  `,
})
export class LokConfirmModalComponent {
  @Input() titre: string = 'Confirmer l\'action';
  @Input() message: string = 'Êtes-vous sûr de vouloir effectuer cette action ?';
  @Input() confirmLabel: string = 'Confirmer';
  @Input() cancelLabel: string = 'Annuler';
  @Input() detailMessage?: string;
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
}

/*
 * Exemple d'utilisation :
 * 
 * <lok-confirm-modal 
 *   titre="Supprimer le bien"
 *   message="Êtes-vous sûr de vouloir supprimer ce bien ? Cette action est irréversible."
 *   confirmLabel="Supprimer"
 *   cancelLabel="Annuler"
 *   detailMessage="L'historique des paiements sera conservé."
 *   (onConfirm)="deleteBien()"
 *   (onCancel)="closeModal()"
 * ></lok-confirm-modal>
 * 
 * Pour archiver :
 * <lok-confirm-modal 
 *   titre="Archiver le bien"
 *   message="Ce bien sera archivé et ne sera plus visible dans votre liste active."
 *   confirmLabel="Archiver"
 *   (onConfirm)="archiveBien()"
 *   (onCancel)="closeModal()"
 * ></lok-confirm-modal>
 */
