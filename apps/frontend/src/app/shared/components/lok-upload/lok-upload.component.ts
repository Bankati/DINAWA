import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LokAlerteComponent } from '../lok-alerte/lok-alerte.component';

export interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

@Component({
  selector: 'lok-upload',
  standalone: true,
  imports: [LokAlerteComponent],
  template: `
    <div class="space-y-4">
      <!-- Zone de drop -->
      <div 
        class="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
        [class.border-gray-300]="!isDragging"
        [class.border-primary.bg-primary-light]="isDragging"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <input 
          type="file" 
          [accept]="accept"
          [multiple]="multiple"
          (change)="onFileSelect($event)"
          class="hidden"
          #fileInput
        />
        
        <div class="space-y-2">
          <svg class="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          <p class="text-sm text-gray-600">
            <button 
              (click)="fileInput.click()"
              class="text-primary font-semibold hover:underline"
            >
              Cliquez pour uploader
            </button>
            ou glissez-déposez
          </p>
          <p class="text-xs text-gray-500">
            {{ acceptLabel }} (Max {{ maxSize }} Mo)
          </p>
        </div>
      </div>

      <!-- Prévisualisation des fichiers -->
      @if (files.length > 0) {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          @for (uploadedFile of files; track uploadedFile.id) {
            <div class="relative group">
              <!-- Preview image -->
              @if (isImage(uploadedFile.file)) {
                <img 
                  [src]="uploadedFile.preview" 
                  [alt]="uploadedFile.file.name"
                  class="w-full h-32 object-cover rounded-lg"
                />
              } @else {
                <div class="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
              }
              
              <!-- Bouton supprimer -->
              <button 
                (click)="removeFile(uploadedFile.id)"
                class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Supprimer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>

              <!-- Nom du fichier -->
              <p class="text-xs text-gray-600 mt-1 truncate">{{ uploadedFile.file.name }}</p>
            </div>
          }
        </div>
      }

      <!-- Message d'erreur -->
      @if (errorMessage) {
        <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
      }
    </div>
  `,
})
export class LokUploadComponent {
  @Input() accept: string = 'image/*,.pdf';
  @Input() maxSize: number = 5; // en Mo
  @Input() multiple: boolean = true;
  @Input() maxFiles: number = 10;
  @Output() filesChange = new EventEmitter<UploadedFile[]>();

  files: UploadedFile[] = [];
  isDragging: boolean = false;
  errorMessage: string = '';

  /**
   * Retourne le label d'acceptation affiché
   */
  get acceptLabel(): string {
    if (this.accept.includes('image')) {
      return this.accept.includes('pdf') ? 'Images et PDF' : 'Images';
    }
    return 'Fichiers';
  }

  /**
   * Gère le drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  /**
   * Gère le drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  /**
   * Gère le drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles) {
      this.handleFiles(Array.from(droppedFiles));
    }
  }

  /**
   * Gère la sélection de fichiers via input
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFiles = input.files;
    if (selectedFiles) {
      this.handleFiles(Array.from(selectedFiles));
      input.value = ''; // Reset input
    }
  }

  /**
   * Traite les fichiers sélectionnés
   */
  handleFiles(newFiles: File[]): void {
    this.errorMessage = '';

    // Vérifier le nombre maximum de fichiers
    if (this.files.length + newFiles.length > this.maxFiles) {
      this.errorMessage = `Maximum ${this.maxFiles} fichiers autorisés`;
      return;
    }

    for (const file of newFiles) {
      // Vérifier la taille
      if (file.size > this.maxSize * 1024 * 1024) {
        this.errorMessage = `Le fichier ${file.name} dépasse la taille maximale de ${this.maxSize} Mo`;
        continue;
      }

      // Vérifier le type
      if (!this.isFileTypeAccepted(file)) {
        this.errorMessage = `Le type de fichier ${file.name} n'est pas accepté`;
        continue;
      }

      // Créer la preview
      const reader = new FileReader();
      reader.onload = () => {
        const uploadedFile: UploadedFile = {
          file,
          preview: reader.result as string,
          id: Math.random().toString(36).substr(2, 9)
        };
        this.files = [...this.files, uploadedFile];
        this.filesChange.emit(this.files);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Vérifie si le type de fichier est accepté
   */
  isFileTypeAccepted(file: File): boolean {
    if (this.accept === '*') return true;
    
    const acceptedTypes = this.accept.split(',').map(t => t.trim());
    return acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.endsWith(type);
      }
      return file.type.match(type.replace('*', '.*'));
    });
  }

  /**
   * Vérifie si le fichier est une image
   */
  isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Supprime un fichier de la liste
   */
  removeFile(id: string): void {
    this.files = this.files.filter(f => f.id !== id);
    this.filesChange.emit(this.files);
  }
}

/*
 * Exemple d'utilisation :
 * 
 * Upload d'images uniquement :
 * <lok-upload 
 *   accept="image/*"
 *   [maxSize]="5"
 *   [multiple]="true"
 *   [maxFiles]="10"
 *   (filesChange)="onFilesChange($event)"
 * ></lok-upload>
 * 
 * Upload d'images et PDF :
 * <lok-upload 
 *   accept="image/*,.pdf"
 *   [maxSize]="5"
 *   [multiple]="true"
 *   (filesChange)="onFilesChange($event)"
 * ></lok-upload>
 * 
 * Upload d'un seul fichier :
 * <lok-upload 
 *   accept=".pdf"
 *   [maxSize]="5"
 *   [multiple]="false"
 *   (filesChange)="onFilesChange($event)"
 * ></lok-upload>
 */
