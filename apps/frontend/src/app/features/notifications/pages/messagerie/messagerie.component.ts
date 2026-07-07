import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LokAlerteComponent } from '../../../../shared/components/lok-alerte/lok-alerte.component';
import { LokUploadComponent, UploadedFile } from '../../../../shared/components/lok-upload/lok-upload.component';
import { CommonModule } from '@angular/common';

export interface Message {
  id: string;
  expediteurId: string;
  expediteurNom: string;
  destinataireId: string;
  destinataireNom: string;
  contenu: string;
  date: Date;
  lu: boolean;
  pieceJointe?: string;
}

export interface Conversation {
  id: string;
  proprietaireId: string;
  proprietaireNom: string;
  locataireId: string;
  locataireNom: string;
  bienId: string;
  bienTitre: string;
  dernierMessage: string;
  dateDernierMessage: Date;
  nonLus: number;
}

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LokAlerteComponent,
    LokUploadComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Messagerie</h1>
            <p class="text-sm text-gray-600">Communiquez avec vos locataires</p>
          </div>
          <button
            routerLink="/dashboard"
            class="btn-secondary"
          >
            Retour
          </button>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="p-6 max-w-6xl mx-auto">
        <!-- Alerte d'erreur -->
        @if (errorMessage) {
          <lok-alerte type="error" [message]="errorMessage"></lok-alerte>
        }

        <!-- Vue liste des conversations -->
        @if (!conversationSelectionnee) {
          <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <div class="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Conversations</h2>
              <button
                (click)="showNewConversation = true"
                class="btn-primary text-sm"
              >
                Nouvelle conversation
              </button>
            </div>
            
            @if (loading) {
              <div class="p-6 text-center text-gray-500">
                Chargement...
              </div>
            } @else if (conversations.length === 0) {
              <div class="p-6 text-center text-gray-500">
                Aucune conversation
              </div>
            } @else {
              <div class="divide-y divide-gray-200">
                @for (conversation of conversations; track conversation.id) {
                  <div
                    (click)="selectionnerConversation(conversation)"
                    [class.bg-blue-50]="conversation.nonLus > 0"
                    class="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div class="flex items-start gap-4">
                      <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {{ conversation.locataireNom.charAt(0) }}
                      </div>
                      
                      <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                          <h3 class="font-semibold text-gray-900">{{ conversation.locataireNom }}</h3>
                          <span class="text-sm text-gray-500">
                            {{ conversation.dateDernierMessage | date:'dd/MM/yyyy HH:mm' }}
                          </span>
                        </div>
                        
                        <p class="text-sm text-gray-600 mb-1">{{ conversation.bienTitre }}</p>
                        <p class="text-sm text-gray-500 truncate">{{ conversation.dernierMessage }}</p>
                      </div>
                      
                      @if (conversation.nonLus > 0) {
                        <div class="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {{ conversation.nonLus }}
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Vue conversation détaillée -->
        @if (conversationSelectionnee) {
          <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <!-- En-tête de conversation -->
            <div class="p-6 border-b border-gray-200 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <button
                  (click)="conversationSelectionnee = null"
                  class="text-gray-600 hover:text-gray-900"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                  {{ conversationSelectionnee.locataireNom.charAt(0) }}
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">{{ conversationSelectionnee.locataireNom }}</h3>
                  <p class="text-sm text-gray-600">{{ conversationSelectionnee.bienTitre }}</p>
                </div>
              </div>
              
              <div class="flex gap-2">
                <button
                  (click)="marquerCommeLus()"
                  class="btn-secondary text-sm"
                >
                  Marquer comme lus
                </button>
                <button
                  (click)="archiverConversation()"
                  class="btn-secondary text-sm"
                >
                  Archiver
                </button>
              </div>
            </div>

            <!-- Messages -->
            <div class="p-6 h-96 overflow-y-auto space-y-4">
              @for (message of messages; track message.id) {
                <div
                  [class]="message.expediteurId === currentUserId ? 'justify-end' : 'justify-start'"
                  class="flex"
                >
                  <div
                    [class]="message.expediteurId === currentUserId ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'"
                    class="max-w-md rounded-lg p-4"
                  >
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xs font-medium">{{ message.expediteurNom }}</span>
                      <span class="text-xs opacity-75">{{ message.date | date:'HH:mm' }}</span>
                    </div>
                    <p class="text-sm">{{ message.contenu }}</p>
                    @if (message.pieceJointe) {
                      <div class="mt-2">
                        <a href="#" class="text-xs underline">
                          📎 {{ message.pieceJointe }}
                        </a>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Formulaire d'envoi -->
            <div class="p-6 border-t border-gray-200">
              <form [formGroup]="messageForm" (ngSubmit)="envoyerMessage()" class="space-y-4">
                <!-- Pièce jointe -->
                @if (showAttachment) {
                  <lok-upload
                    accept=".pdf,.doc,.docx,image/*"
                    [maxSize]="10"
                    [multiple]="false"
                    [maxFiles]="1"
                    (filesChange)="onAttachmentChange($event)"
                  ></lok-upload>
                }

                <div class="flex gap-4">
                  <button
                    type="button"
                    (click)="showAttachment = !showAttachment"
                    class="text-gray-600 hover:text-gray-900"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                    </svg>
                  </button>
                  
                  <input
                    type="text"
                    formControlName="contenu"
                    class="input-field flex-1"
                    placeholder="Écrivez votre message..."
                  />
                  
                  <button
                    type="submit"
                    [disabled]="messageForm.invalid || isSending"
                    class="btn-primary"
                  >
                    @if (isSending) {
                      <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    } @else {
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                      </svg>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- Modal nouvelle conversation -->
        @if (showNewConversation) {
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h2 class="text-lg font-semibold text-gray-900 mb-4">Nouvelle conversation</h2>
              
              <form [formGroup]="newConversationForm" (ngSubmit)="creerConversation()" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Locataire</label>
                  <select
                    formControlName="locataireId"
                    class="input-field"
                  >
                    <option value="">Sélectionnez un locataire</option>
                    <option value="1">Paul Mensah</option>
                    <option value="2">Kofi Adzo</option>
                    <option value="3">Mawunyo Koffi</option>
                    <option value="4">Yao Komlan</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bien</label>
                  <select
                    formControlName="bienId"
                    class="input-field"
                  >
                    <option value="">Sélectionnez un bien</option>
                    <option value="1">Appartement Lomé Centre</option>
                    <option value="2">Villa Sokodé</option>
                    <option value="3">Studio Kara</option>
                  </select>
                </div>

                <div class="flex gap-4">
                  <button
                    type="submit"
                    [disabled]="newConversationForm.invalid"
                    class="btn-primary flex-1"
                  >
                    Créer
                  </button>
                  <button
                    type="button"
                    (click)="showNewConversation = false"
                    class="btn-secondary flex-1"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MessagerieComponent implements OnInit {
  messageForm: FormGroup;
  newConversationForm: FormGroup;
  conversationSelectionnee: Conversation | null = null;
  conversations: Conversation[] = [];
  messages: Message[] = [];
  loading: boolean = false;
  isSending: boolean = false;
  showNewConversation: boolean = false;
  showAttachment: boolean = false;
  errorMessage: string = '';
  currentUserId: string = 'prop-1';
  attachment: File | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.messageForm = this.fb.group({
      contenu: ['', Validators.required]
    });

    this.newConversationForm = this.fb.group({
      locataireId: ['', Validators.required],
      bienId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadConversations();
  }

  /**
   * Charge les conversations
   */
  loadConversations(): void {
    this.loading = true;
    
    // Simulation de chargement
    setTimeout(() => {
      this.conversations = [
        {
          id: '1',
          proprietaireId: 'prop-1',
          proprietaireNom: 'Jean Kouassi',
          locataireId: '1',
          locataireNom: 'Paul Mensah',
          bienId: '1',
          bienTitre: 'Appartement Lomé Centre',
          dernierMessage: 'Merci pour la réponse rapide !',
          dateDernierMessage: new Date('2024-06-20T14:30:00'),
          nonLus: 2
        },
        {
          id: '2',
          proprietaireId: 'prop-1',
          proprietaireNom: 'Jean Kouassi',
          locataireId: '2',
          locataireNom: 'Kofi Adzo',
          bienId: '2',
          bienTitre: 'Villa Sokodé',
          dernierMessage: 'Le loyer a été payé',
          dateDernierMessage: new Date('2024-06-19T10:15:00'),
          nonLus: 0
        },
        {
          id: '3',
          proprietaireId: 'prop-1',
          proprietaireNom: 'Jean Kouassi',
          locataireId: '3',
          locataireNom: 'Mawunyo Koffi',
          bienId: '3',
          bienTitre: 'Studio Kara',
          dernierMessage: 'Demande de réparation',
          dateDernierMessage: new Date('2024-06-18T16:45:00'),
          nonLus: 1
        }
      ];
      this.loading = false;
    }, 500);
  }

  /**
   * Sélectionne une conversation
   */
  selectionnerConversation(conversation: Conversation): void {
    this.conversationSelectionnee = conversation;
    this.loadMessages(conversation.id);
  }

  /**
   * Charge les messages d'une conversation
   */
  loadMessages(conversationId: string): void {
    // Simulation de chargement
    this.messages = [
      {
        id: '1',
        expediteurId: '1',
        expediteurNom: 'Paul Mensah',
        destinataireId: 'prop-1',
        destinataireNom: 'Jean Kouassi',
        contenu: 'Bonjour, je voulais savoir si je peux payer le loyer en deux fois ce mois-ci ?',
        date: new Date('2024-06-20T10:00:00'),
        lu: true
      },
      {
        id: '2',
        expediteurId: 'prop-1',
        expediteurNom: 'Jean Kouassi',
        destinataireId: '1',
        destinataireNom: 'Paul Mensah',
        contenu: 'Bonjour Paul, oui c\'est possible. Faites-moi savoir quand vous comptez payer la première moitié.',
        date: new Date('2024-06-20T11:30:00'),
        lu: true
      },
      {
        id: '3',
        expediteurId: '1',
        expediteurNom: 'Paul Mensah',
        destinataireId: 'prop-1',
        destinataireNom: 'Jean Kouassi',
        contenu: 'Merci pour la réponse rapide ! Je paierai la première moitié demain.',
        date: new Date('2024-06-20T14:30:00'),
        lu: false
      }
    ];
  }

  /**
   * Envoie un message
   */
  envoyerMessage(): void {
    if (this.messageForm.invalid || !this.conversationSelectionnee) {
      return;
    }

    this.isSending = true;
    this.errorMessage = '';

    const conversation = this.conversationSelectionnee;

    // Simulation d'envoi
    setTimeout(() => {
      const nouveauMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        expediteurId: this.currentUserId,
        expediteurNom: conversation.proprietaireNom,
        destinataireId: conversation.locataireId,
        destinataireNom: conversation.locataireNom,
        contenu: this.messageForm.value.contenu,
        date: new Date(),
        lu: false,
        pieceJointe: this.attachment?.name
      };

      this.messages.push(nouveauMessage);
      this.messageForm.reset();
      this.attachment = null;
      this.showAttachment = false;
      this.isSending = false;

      // Mettre à jour le dernier message de la conversation
      conversation.dernierMessage = nouveauMessage.contenu;
      conversation.dateDernierMessage = nouveauMessage.date;
    }, 1000);
  }

  /**
   * Gère le changement de pièce jointe
   */
  onAttachmentChange(files: UploadedFile[]): void {
    if (files.length > 0) {
      this.attachment = files[0].file;
    }
  }

  /**
   * Archive la conversation
   */
  archiverConversation(): void {
    if (this.conversationSelectionnee) {
      this.conversations = this.conversations.filter(c => c.id !== this.conversationSelectionnee!.id);
      this.conversationSelectionnee = null;
    }
  }

  /**
   * Crée une nouvelle conversation
   */
  creerConversation(): void {
    if (this.newConversationForm.invalid) {
      return;
    }

    const locataireId = this.newConversationForm.value.locataireId;
    const bienId = this.newConversationForm.value.bienId;

    // Simulation de création
    const nouvelleConversation: Conversation = {
      id: Math.random().toString(36).substr(2, 9),
      proprietaireId: this.currentUserId,
      proprietaireNom: 'Jean Kouassi',
      locataireId: locataireId,
      locataireNom: locataireId === '1' ? 'Paul Mensah' : locataireId === '2' ? 'Kofi Adzo' : 'Mawunyo Koffi',
      bienId: bienId,
      bienTitre: bienId === '1' ? 'Appartement Lomé Centre' : bienId === '2' ? 'Villa Sokodé' : 'Studio Kara',
      dernierMessage: 'Nouvelle conversation',
      dateDernierMessage: new Date(),
      nonLus: 0
    };

    this.conversations.unshift(nouvelleConversation);
    this.showNewConversation = false;
    this.newConversationForm.reset();
    this.selectionnerConversation(nouvelleConversation);
  }

  /**
   * Marque tous les messages comme lus
   */
  marquerCommeLus(): void {
    this.messages.forEach(m => m.lu = true);
    if (this.conversationSelectionnee) {
      this.conversationSelectionnee!.nonLus = 0;
    }
  }
}
