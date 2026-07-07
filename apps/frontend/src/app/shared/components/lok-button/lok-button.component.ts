import { Component, Input, HostBinding, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lok-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      class="lok-button"
      [class]="buttonClass"
      [disabled]="disabled || loading"
      (click)="onClick()"
    >
      @if (loading) {
        <svg class="lok-button-spinner" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.416" stroke-dashoffset="31.416">
            <animate attributeName="stroke-dashoffset" from="31.416" to="0" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      } @else if (icon) {
        <svg class="lok-button-icon" [innerHTML]="icon"></svg>
      }
      
      <span class="lok-button-text">
        <ng-content></ng-content>
      </span>
      
      @if (suffixIcon) {
        <svg class="lok-button-suffix-icon" [innerHTML]="suffixIcon"></svg>
      }
    </button>
  `,
  styles: `
    .lok-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }

    .lok-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Primary variant */
    .lok-button.primary {
      background: var(--color-primary);
      color: white;
    }

    .lok-button.primary:hover:not(:disabled) {
      background: var(--color-primary-dark);
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(15, 76, 129, 0.3);
    }

    .lok-button.primary:active:not(:disabled) {
      transform: translateY(0);
    }

    /* Secondary variant */
    .lok-button.secondary {
      background: white;
      color: var(--color-primary);
      border: 1px solid var(--color-primary);
    }

    .lok-button.secondary:hover:not(:disabled) {
      background: rgba(15, 76, 129, 0.05);
    }

    /* Accent variant */
    .lok-button.accent {
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
      color: white;
    }

    .lok-button.accent:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15, 76, 129, 0.4);
    }

    /* Outline variant */
    .lok-button.outline {
      background: transparent;
      color: var(--color-primary);
      border: 1px solid #d1d5db;
    }

    .lok-button.outline:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: rgba(15, 76, 129, 0.05);
    }

    /* Ghost variant */
    .lok-button.ghost {
      background: transparent;
      color: var(--color-primary);
    }

    .lok-button.ghost:hover:not(:disabled) {
      background: rgba(15, 76, 129, 0.05);
    }

    /* Danger variant */
    .lok-button.danger {
      background: #ef4444;
      color: white;
    }

    .lok-button.danger:hover:not(:disabled) {
      background: #dc2626;
    }

    /* Success variant */
    .lok-button.success {
      background: #22c55e;
      color: white;
    }

    .lok-button.success:hover:not(:disabled) {
      background: #16a34a;
    }

    /* Sizes */
    .lok-button.sm {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
    }

    .lok-button.lg {
      padding: 1rem 2rem;
      font-size: 1rem;
    }

    .lok-button.xl {
      padding: 1.25rem 2.5rem;
      font-size: 1.125rem;
    }

    /* Full width */
    .lok-button.full-width {
      width: 100%;
    }

    /* Icons */
    .lok-button-icon,
    .lok-button-suffix-icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .lok-button-spinner {
      width: 1.25rem;
      height: 1.25rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .lok-button-text {
      flex: 1;
    }
  `
})
export class LokButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'success' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() icon: string = '';
  @Input() suffixIcon: string = '';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() fullWidth: boolean = false;

  @Output() click = new EventEmitter<void>();

  get buttonClass(): string {
    const classes: string[] = [this.variant, this.size];
    if (this.fullWidth) classes.push('full-width');
    return classes.join(' ');
  }

  @HostListener('click')
  onClick(): void {
    if (!this.disabled && !this.loading) {
      this.click.emit();
    }
  }
}
