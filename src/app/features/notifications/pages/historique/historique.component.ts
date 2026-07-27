import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { RealtimeNotificationsService, AppNotification } from '../../../../core/services/realtime-notifications.service';
import { LokDatePipe } from '../../../../shared/pipes/lok-date.pipe';

interface DisplayNotif extends AppNotification {
  type: string;
}

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LokDatePipe],
  template: `
    <div class="min-h-screen" style="background:#F0F4FA">

      <!-- ── HEADER ── -->
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-logo">
            <img src="/assets/WARAH-logo.png" alt="WARAH" class="logo-img">
          </div>
          <div class="page-divider"></div>
          <div>
            <h1 class="page-title">Notifications</h1>
            <p class="page-sub">{{ unreadCount }} non lu{{ unreadCount !== 1 ? 's' : '' }} · {{ notifications.length }} au total</p>
          </div>
        </div>
        <button (click)="reload()" class="btn-primary page-btn" [disabled]="loading">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/>
          </svg>
          <span>Actualiser</span>
        </button>
      </div>

      <!-- ── KPI cards ── -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 px-6 pt-6">
        <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p class="text-sm text-gray-600">Total</p>
          <p class="text-2xl font-bold" style="color:#111827">{{ notifications.length }}</p>
        </div>
        <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p class="text-sm text-gray-600">Dernières 24h</p>
          <p class="text-2xl font-bold" style="color:#2563eb">{{ unreadCount }}</p>
        </div>
        <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p class="text-sm text-gray-600">Ce mois</p>
          <p class="text-2xl font-bold" style="color:#16a34a">{{ countThisMonth }}</p>
        </div>
      </div>

      <!-- ── FILTRES ── -->
      <div class="px-6 mt-6 mb-6" [formGroup]="filterForm">
        <div class="bg-white rounded-2xl shadow-xl p-3 flex gap-3 flex-wrap items-center"
             style="box-shadow:0 8px 40px rgba(10,38,80,.13)">
          <div class="flex gap-1.5 flex-wrap">
            @for (opt of typeOptions; track opt.v) {
              <button type="button" (click)="setFilter('type', opt.v)"
                [class]="filterForm.value.type === opt.v ? 'ftab-on' : 'ftab-off'">{{ opt.l }}</button>
            }
          </div>
          <button type="button" (click)="clearFilters()" class="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors">✕ Reset</button>
        </div>
      </div>

      <!-- ── LISTE ── -->
      <div class="px-6 pb-8 max-w-4xl mx-auto">
        @if (loading) {
          <div class="space-y-3">
            @for (i of [1,2,3,4]; track i) {
              <div class="bg-white rounded-2xl p-5 animate-pulse">
                <div class="flex gap-4">
                  <div class="w-10 h-10 rounded-xl bg-gray-100"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-3 bg-gray-100 rounded w-1/3"></div>
                    <div class="h-4 bg-gray-100 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (filtered.length === 0) {
          <div class="bg-white rounded-2xl p-12 text-center" style="box-shadow:0 4px 24px rgba(10,38,80,.08)">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style="background:#EEF4FF">
              <svg class="w-8 h-8" fill="none" stroke="#0F4C81" stroke-width="1.5" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <p class="text-gray-800 font-bold text-lg mb-1">Aucune notification</p>
            <p class="text-sm text-gray-400">Modifiez les filtres ou revenez plus tard.</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (notif of filtered; track notif.id) {
              <div class="notif-card bg-white rounded-2xl overflow-hidden"
                   style="box-shadow:0 2px 12px rgba(10,38,80,.06)">
                <div class="flex items-start gap-4 p-4">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                       [class]="iconClass(notif.type)">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                    </svg>
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="px-2 py-0.5 rounded-full text-xs font-bold" [class]="channelBadge(notif.channel)">
                        {{ channelLabel(notif.channel) }}
                      </span>
                      <span class="text-xs text-gray-400 ml-auto">{{ notif.createdAt | lokDate }}</span>
                    </div>
                    <p class="text-sm font-bold text-gray-900 mb-0.5">{{ notif.titre }}</p>
                    <p class="text-xs text-gray-400">{{ notif.event }}</p>
                  </div>
                </div>
              </div>
            }
          </div>
          <p class="text-center text-xs text-gray-400 mt-5">{{ filtered.length }} notification{{ filtered.length !== 1 ? 's' : '' }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .logo-img { height: 88px; width: auto; object-fit: contain; background: transparent !important; mix-blend-mode: multiply; }
    .page-header { background: white; border-bottom: 1px solid #E5E7EB; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .page-header-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .page-divider { width: 1px; height: 32px; background: #E5E7EB; flex-shrink: 0; }
    .page-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; white-space: nowrap; }
    .page-sub { font-size: 13px; color: #6B7280; margin-top: 1px; }
    .page-btn { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .btn-primary { background: #0F4C81; color: white; border: none; border-radius: .625rem; padding: .625rem 1.25rem; font-weight: 600; cursor: pointer; font-size: .9rem; transition: background .2s; }
    .btn-primary:hover:not(:disabled) { background: #0A2650; }
    .btn-primary:disabled { opacity: .6; cursor: default; }
    .ftab-on  { padding:7px 14px; border-radius:10px; font-size:12px; font-weight:700; background:#0F4C81; color:#fff; border:none; cursor:pointer; transition:all .15s; }
    .ftab-off { padding:7px 14px; border-radius:10px; font-size:12px; font-weight:500; background:#F3F4F6; color:#6b7280; border:none; cursor:pointer; transition:all .15s; }
    .ftab-off:hover { background:#E5E7EB; color:#374151; }
    .notif-card { transition:transform .15s, box-shadow .15s; border-left:3px solid transparent; }
    .notif-card:hover { transform:translateX(3px); box-shadow:0 8px 32px rgba(10,38,80,.12) !important; }
    @media (max-width: 640px) {
      .page-header { padding: 12px 16px 12px 64px; }
      .page-logo { display: none; }
      .page-divider { display: none; }
      .page-title { font-size: 18px; }
      .page-sub { display: none; }
    }
  `],
})
export class HistoriqueComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  loading = false;
  notifications: DisplayNotif[] = [];
  filtered: DisplayNotif[] = [];
  private sub: Subscription | null = null;

  typeOptions = [
    { v: 'tous',       l: 'Tous' },
    { v: 'paiement',   l: 'Paiement' },
    { v: 'delegation', l: 'Délégation' },
    { v: 'systeme',    l: 'Système' },
  ];

  constructor(
    private fb: FormBuilder,
    private realtimeService: RealtimeNotificationsService,
  ) {
    this.filterForm = this.fb.group({ type: ['tous'] });
  }

  get unreadCount(): number {
    return this.realtimeService.unreadCount;
  }

  get countThisMonth(): number {
    const debut = new Date();
    debut.setDate(1); debut.setHours(0, 0, 0, 0);
    return this.notifications.filter(n => new Date(n.createdAt) >= debut).length;
  }

  ngOnInit(): void {
    this.sub = this.realtimeService.notifications$.subscribe(notifs => {
      this.notifications = notifs.map(n => ({ ...n, type: this.typeFor(n.event) }));
      this.applyFilters();
    });
  }

  private typeFor(event: string): string {
    if (event.startsWith('payment') || event === 'receipt' || event === 'overdue-alert') return 'paiement';
    if (event.startsWith('delegation')) return 'delegation';
    return 'systeme';
  }

  reload(): void {
    this.realtimeService.init();
  }

  setFilter(key: string, value: string): void {
    this.filterForm.patchValue({ [key]: value });
    this.applyFilters();
  }

  applyFilters(): void {
    const type = this.filterForm.value.type;
    this.filtered = type === 'tous'
      ? [...this.notifications]
      : this.notifications.filter(n => n.type === type);
  }

  clearFilters(): void {
    this.filterForm.patchValue({ type: 'tous' });
    this.applyFilters();
  }

  iconClass(type: string): string {
    const m: Record<string, string> = {
      paiement:   'bg-green-100 text-green-600',
      delegation: 'bg-blue-100 text-blue-600',
      systeme:    'bg-gray-100 text-gray-600',
    };
    return m[type] ?? 'bg-gray-100 text-gray-600';
  }

  channelBadge(channel: string): string {
    return channel === 'EMAIL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  }

  channelLabel(channel: string): string {
    return channel === 'EMAIL' ? 'Email' : 'Push';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
