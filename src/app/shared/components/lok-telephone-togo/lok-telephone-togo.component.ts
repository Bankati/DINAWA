import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'lok-telephone-togo',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LokTelephoneTogoComponent),
      multi: true
    }
  ],
  template: `
    <div class="relative">
      <!-- Préfixe +228 -->
      <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-medium">
        +228
      </span>

      <!-- Input téléphone -->
      <input
        type="tel"
        [value]="displayValue"
        (input)="onInput($event)"
        (blur)="onBlur()"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [class]="inputClasses()"
        class="input-field pl-16"
        maxlength="11"
      />

      <!-- Icône téléphone -->
      <span class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
      </span>

      <!-- Message d'erreur -->
      @if (errorMessage && showError) {
        <p class="text-red-500 text-xs mt-1">{{ errorMessage }}</p>
      }
    </div>
  `,
})
export class LokTelephoneTogoComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'XX XX XX XX';
  @Input() disabled: boolean = false;
  @Input() showError: boolean = true;
  @Output() valueChange = new EventEmitter<string>();

  private _value: string = '';
  errorMessage: string = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  /**
   * Retourne la valeur affichée dans l'input (formatée avec espaces)
   */
  get displayValue(): string {
    return this.formatPhoneNumber(this._value);
  }

  /**
   * Retourne les classes CSS pour l'input
   */
  inputClasses(): string {
    const baseClasses = 'input-field pl-16';
    if (this.errorMessage && this.showError) {
      return `${baseClasses} border-red-500 focus:ring-red-500 focus:border-red-500`;
    }
    return baseClasses;
  }

  /**
   * Formate un numéro de téléphone togolais avec espaces
   * Format : XX XX XX XX
   */
  private formatPhoneNumber(value: string): string {
    // Supprimer tous les caractères non numériques sauf le préfixe
    const cleaned = value.replace(/\D/g, '');
    
    // Retirer le préfixe +228 si présent
    const withoutPrefix = cleaned.replace(/^228/, '');
    
    // Formater avec espaces
    if (withoutPrefix.length <= 2) {
      return withoutPrefix;
    } else if (withoutPrefix.length <= 4) {
      return `${withoutPrefix.slice(0, 2)} ${withoutPrefix.slice(2)}`;
    } else if (withoutPrefix.length <= 6) {
      return `${withoutPrefix.slice(0, 2)} ${withoutPrefix.slice(2, 4)} ${withoutPrefix.slice(4)}`;
    } else {
      return `${withoutPrefix.slice(0, 2)} ${withoutPrefix.slice(2, 4)} ${withoutPrefix.slice(4, 6)} ${withoutPrefix.slice(6, 8)}`;
    }
  }

  /**
   * Gère la saisie de l'utilisateur
   */
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Supprimer tous les espaces
    value = value.replace(/\s/g, '');

    // Ne conserver que les chiffres
    value = value.replace(/\D/g, '');

    // Limiter à 8 chiffres (sans le préfixe)
    if (value.length > 8) {
      value = value.slice(0, 8);
    }

    this._value = value;
    this.validate();
    this.onChange(value);
    this.valueChange.emit(value);
  }

  /**
   * Gère la perte de focus
   */
  onBlur(): void {
    this.onTouched();
    this.validate();
  }

  /**
   * Valide le numéro de téléphone togolais
   * Format attendu : 8 chiffres après le préfixe +228
   */
  private validate(): void {
    if (!this._value) {
      this.errorMessage = 'Le numéro de téléphone est requis';
      return;
    }

    if (this._value.length !== 8) {
      this.errorMessage = 'Le numéro doit contenir 8 chiffres';
      return;
    }

    // Vérifier que le numéro commence par un chiffre valide (0, 7, 8, 9 pour le Togo)
    const firstDigit = this._value[0];
    if (!['0', '7', '8', '9'].includes(firstDigit)) {
      this.errorMessage = 'Le numéro doit commencer par 0, 7, 8 ou 9';
      return;
    }

    this.errorMessage = '';
  }

  /**
   * Implémentation de ControlValueAccessor - writeValue
   */
  writeValue(value: string): void {
    if (value) {
      // Retirer le préfixe +228 si présent
      this._value = value.replace(/\D/g, '').replace(/^228/, '');
    } else {
      this._value = '';
    }
    this.validate();
  }

  /**
   * Implémentation de ControlValueAccessor - registerOnChange
   */
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  /**
   * Implémentation de ControlValueAccessor - registerOnTouched
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Implémentation de ControlValueAccessor - setDisabledState
   */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /**
   * Retourne le numéro complet avec préfixe international
   */
  getFullNumber(): string {
    if (!this._value || this._value.length !== 8) {
      return '';
    }
    return `+228${this._value}`;
  }
}

/*
 * Exemple d'utilisation :
 * 
 * Avec Reactive Forms :
 * <lok-telephone-togo 
 *   [formControl]="telephoneControl"
 *   [showError]="true"
 * ></lok-telephone-togo>
 * 
 * Avec ngModel :
 * <lok-telephone-togo 
 *   [(ngModel)]="telephone"
 *   (valueChange)="onTelephoneChange($event)"
 * ></lok-telephone-togo>
 * 
 * Pour obtenir le numéro complet avec préfixe :
 * @ViewChild('phoneInput') phoneInput!: LokTelephoneTogoComponent;
 * const fullNumber = this.phoneInput.getFullNumber(); // +22890123456
 */
