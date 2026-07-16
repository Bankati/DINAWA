import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly apiUrl = `${environment.apiUrl}/push`;

  constructor(private http: HttpClient) {}

  getVapidKey(): Observable<{ publicKey: string }> {
    return this.http.get<{ publicKey: string }>(`${this.apiUrl}/vapid-public-key`);
  }

  subscribe(): Observable<any> {
    return from(this.requestPermissionAndSubscribe()).pipe(
      switchMap((sub) => this.http.post(`${this.apiUrl}/subscribe`, sub))
    );
  }

  unsubscribe(endpoint: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/unsubscribe`, { endpoint });
  }

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  private async requestPermissionAndSubscribe(): Promise<PushSubscription> {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permission refusée');

    const reg = await navigator.serviceWorker.ready;
    // Clé VAPID depuis le backend
    const { publicKey } = await this.http.get<{ publicKey: string }>(`${this.apiUrl}/vapid-public-key`).toPromise() as { publicKey: string };
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(publicKey),
    });
    return sub;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }
}
