import { Component, Input, Output, EventEmitter, forwardRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'lok-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LokInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="lok-input-wrapper" [class.focused]="isFocused" [class.has-error]="hasError">
      @if (label) {
        <label class="lok-input-label">{{ label }}</label>
      }
      
      <div class="lok-input-container">
        @if (icon) {
          <svg class="lok-input-icon" [innerHTML]="icon"></svg>
        }
        
        <input
          [type]="type"
          [value]="value"
          (input)="onInput($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readonly]="readonly"
          class="lok-input-field"
        />
        
        @if (showPasswordToggle && type === 'password') {
          <button type="button" class="lok-password-toggle" (click)="togglePassword()">
            <svg *ngIf="!showPassword" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <svg *ngIf="showPassword" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          </button>
        }
        
        @if (suffix) {
          <span class="lok-input-suffix">{{ suffix }}</span>
        }
      </div>
      
      <div class="lok-input-focus-line" [class.active]="isFocused"></div>
      
      @if (errorMessage && hasError) {
        <div class="lok-input-error">{{ errorMessage }}</div>
      }
      
      @if (helperText && !hasError) {
        <div class="lok-input-helper">{{ helperText }}</div>
      }
    </div>
  `,
  styles: `
    .lok-input-wrapper {
      margin-bottom: 1rem;
      position: relative;
    }

    .lok-input-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .lok-input-container {
      position: relative;
      display: flex;
      align-items: center;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      transition: all 0.2s ease;
    }

    .lok-input-wrapper.focused .lok-input-container {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(15, 76, 129, 0.1);
    }

    .lok-input-wrapper.has-error .lok-input-container {
      border-color: #ef4444;
    }

    .lok-input-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: #9ca3af;
      margin-right: 0.75rem;
      transition: color 0.2s ease;
    }

    .lok-input-wrapper.focused .lok-input-icon {
      color: var(--color-primary);
    }

    .lok-input-field {
      flex: 1;
      border: none;
      outline: none;
      font-size: 16px;
      color: #111827;
      background: transparent;
    }

    .lok-input-field::placeholder {
      color: #9ca3af;
    }

    .lok-input-field:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }

    .lok-password-toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      margin-left: 0.5rem;
      color: #9ca3af;
      transition: color 0.2s ease;
    }

    .lok-password-toggle:hover {
      color: var(--color-primary);
    }

    .eye-icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .lok-input-suffix {
      margin-left: 0.75rem;
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    .lok-input-focus-line {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--color-primary);
      transform: scaleX(0);
      transition: transform 0.2s ease;
    }

    .lok-input-focus-line.active {
      transform: scaleX(1);
    }

    .lok-input-error {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: #ef4444;
    }

    .lok-input-helper {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: #6b7280;
    }
  `
})
export class LokInputComponent implements ControlValueAccessor {
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' = 'text';
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() icon: string = '';
  @Input() suffix: string = '';
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() showPasswordToggle: boolean = false;
  @Input() errorMessage: string = '';
  @Input() helperText: string = '';
  @Input() hasError: boolean = false;

  @Output() valueChange = new EventEmitter<string>();

  value: string = '';
  isFocused: boolean = false;
  showPassword: boolean = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }

  onFocus(): void {
    this.isFocused = true;
    this.onTouched();
  }

  onBlur(): void {
    this.isFocused = false;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
