import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED_INACTIVITY' | 'SUSPENDED_PAYMENT' | 'SUSPENDED_ADMIN';

export interface AccountStatusResponse {
  accountStatus: AccountStatus;
  suspendedReason: string | null;
  unblockCondition: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly apiUrl = `${environment.apiUrl}/account`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<AccountStatusResponse> {
    return this.http.get<AccountStatusResponse>(`${this.apiUrl}/status`);
  }
}
