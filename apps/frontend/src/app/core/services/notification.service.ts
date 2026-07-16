import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications$ = new Subject<Notification>();
  readonly notifications$ = this._notifications$.asObservable();

  success(message: string): void {
    this._notifications$.next({ type: 'success', message });
  }

  error(message: string): void {
    this._notifications$.next({ type: 'error', message });
  }

  warning(message: string): void {
    this._notifications$.next({ type: 'warning', message });
  }

  info(message: string): void {
    this._notifications$.next({ type: 'info', message });
  }
}
