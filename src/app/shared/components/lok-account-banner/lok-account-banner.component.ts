import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService, AccountStatusResponse } from '../../../core/services/account.service';

@Component({
  selector: 'lok-account-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (status && status.accountStatus !== 'ACTIVE') {
      <div [class]="bannerClass()">
        <div class="flex items-start gap-3 max-w-5xl mx-auto px-4 py-3">
          <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <div class="flex-1">
            <p class="font-semibold text-sm">
              @if (status.accountStatus === 'SUSPENDED_INACTIVITY') { Compte suspendu — inactivité }
              @if (status.accountStatus === 'SUSPENDED_PAYMENT') { Compte suspendu — paiement en attente }
              @if (status.accountStatus === 'SUSPENDED_ADMIN') { Compte suspendu par l'administration }
            </p>
            @if (status.suspendedReason) {
              <p class="text-xs mt-0.5 opacity-90">{{ status.suspendedReason }}</p>
            }
            @if (status.unblockCondition) {
              <p class="text-xs mt-1 font-medium">Pour débloquer : {{ status.unblockCondition }}</p>
            }
          </div>
          @if (status.accountStatus === 'SUSPENDED_INACTIVITY') {
            <a routerLink="/dashboard/biens/nouveau"
               class="flex-shrink-0 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              Ajouter un bien
            </a>
          }
        </div>
      </div>
    }
  `,
})
export class LokAccountBannerComponent implements OnInit {
  status: AccountStatusResponse | null = null;

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    this.accountService.getStatus().subscribe({
      next: (s) => { this.status = s; },
      error: () => { /* silencieux si non connecté */ },
    });
  }

  bannerClass(): string {
    switch (this.status?.accountStatus) {
      case 'SUSPENDED_INACTIVITY': return 'bg-amber-600 text-white text-sm';
      case 'SUSPENDED_PAYMENT':    return 'bg-red-600 text-white text-sm';
      case 'SUSPENDED_ADMIN':      return 'bg-gray-800 text-white text-sm';
      default:                     return '';
    }
  }
}
