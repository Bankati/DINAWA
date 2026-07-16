import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type NotificationType = 'paiement' | 'bien' | 'contrat' | 'maintenance' | 'systeme';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  titre: string;
  message: string;
  date: Date;
  lu: boolean;
  priorite: 'haute' | 'moyenne' | 'basse';
  lien?: string;
}

export interface NotificationsFilters {
  type?: string;
  lu?: boolean;
  priorite?: string;
  dateDebut?: string;
  dateFin?: string;
}

export interface NotificationsStats {
  total: number;
  nonLues: number;
  lues: number;
  urgentes: number;
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

export interface MessageRequest {
  conversationId: string;
  contenu: string;
  pieceJointe?: string;
}

export interface ConversationRequest {
  locataireId: string;
  bienId: string;
  messageInitial: string;
}

export interface NotificationPreferences {
  paiementsRetard: boolean;
  paiementsConfirmation: boolean;
  paiementsEcheance: boolean;
  messagesNouveaux: boolean;
  messagesReponses: boolean;
  biensNouvellesAnnonces: boolean;
  biensChangementsStatut: boolean;
  biensEcheancesContrats: boolean;
  systemeConnexions: boolean;
  systemeRapports: boolean;
  canalEmail: boolean;
  canalSms: boolean;
  canalApp: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationsBackendService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(filters?: NotificationsFilters): Observable<NotificationRecord[]> {
    let params = new HttpParams();
    if (filters?.type && filters.type !== 'tous') params = params.set('type', filters.type);
    if (filters?.lu !== undefined) params = params.set('lu', String(filters.lu));
    if (filters?.priorite && filters.priorite !== 'tous') params = params.set('priorite', filters.priorite);
    if (filters?.dateDebut) params = params.set('dateDebut', filters.dateDebut);
    if (filters?.dateFin) params = params.set('dateFin', filters.dateFin);
    return this.http.get<NotificationRecord[]>(this.apiUrl, { params });
  }

  getStats(): Observable<NotificationsStats> {
    return this.http.get<NotificationsStats>(`${this.apiUrl}/stats`);
  }

  marquerLue(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/lire`, {});
  }

  marquerToutesLues(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/lire-tout`, {});
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/messagerie`);
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/messagerie/${conversationId}/messages`);
  }

  envoyerMessage(req: MessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/messagerie/${req.conversationId}/messages`, { contenu: req.contenu });
  }

  creerConversation(req: ConversationRequest): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.apiUrl}/messagerie`, req);
  }

  getPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.apiUrl}/preferences`);
  }

  sauvegarderPreferences(prefs: NotificationPreferences): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.apiUrl}/preferences`, prefs);
  }
}
