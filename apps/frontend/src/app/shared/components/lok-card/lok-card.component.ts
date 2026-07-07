import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lok-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lok-card" [class.hoverable]="hoverable" [class.clickable]="clickable">
      @if (header) {
        <div class="lok-card-header">
          <div class="lok-card-title-group">
            @if (icon) {
              <div class="lok-card-icon" [class]="iconColor">
                <svg [innerHTML]="icon"></svg>
              </div>
            }
            <div>
              <h3 class="lok-card-title">{{ title }}</h3>
              @if (subtitle) {
                <p class="lok-card-subtitle">{{ subtitle }}</p>
              }
            </div>
          </div>
          @if (headerAction) {
            <div class="lok-card-header-action">
              <ng-content select="[header-action]"></ng-content>
            </div>
          }
        </div>
      }
      
      <div class="lok-card-body">
        <ng-content></ng-content>
      </div>
      
      @if (footer) {
        <div class="lok-card-footer">
          <ng-content select="[footer]"></ng-content>
        </div>
      }
    </div>
  `,
  styles: `
    .lok-card {
      background: white;
      border-radius: 0.75rem;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      transition: all 0.2s ease;
      overflow: hidden;
    }

    .lok-card.hoverable:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .lok-card.clickable {
      cursor: pointer;
    }

    .lok-card.clickable:hover {
      border-color: var(--color-primary);
    }

    .lok-card-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .lok-card-title-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .lok-card-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lok-card-icon svg {
      width: 1.5rem;
      height: 1.5rem;
    }

    .lok-card-icon.primary {
      background: rgba(15, 76, 129, 0.1);
      color: var(--color-primary);
    }

    .lok-card-icon.green {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .lok-card-icon.blue {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }

    .lok-card-icon.red {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .lok-card-icon.yellow {
      background: rgba(234, 179, 8, 0.1);
      color: #eab308;
    }

    .lok-card-icon.purple {
      background: rgba(168, 85, 247, 0.1);
      color: #a855f7;
    }

    .lok-card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .lok-card-subtitle {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0.25rem 0 0 0;
    }

    .lok-card-header-action {
      display: flex;
      align-items: center;
    }

    .lok-card-body {
      padding: 1.5rem;
    }

    .lok-card-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }
  `
})
export class LokCardComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() icon: string = '';
  @Input() iconColor: 'primary' | 'green' | 'blue' | 'red' | 'yellow' | 'purple' = 'primary';
  @Input() header: boolean = true;
  @Input() footer: boolean = false;
  @Input() hoverable: boolean = false;
  @Input() clickable: boolean = false;

  @HostBinding('class') get hostClasses() {
    return '';
  }
}
