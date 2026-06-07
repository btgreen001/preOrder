import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { parseQuantityInput } from '../utils/quantity-format.util';

export interface QuantityValidatorOptions {
  required?: boolean;
  allowZero?: boolean;
  min?: number;
  max?: number;
}

export function quantityFormatValidator(options: QuantityValidatorOptions = {}): ValidatorFn {
  const {
    required = true,
    allowZero = false,
    min,
    max
  } = options;

  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return required ? { quantityRequired: true } : null;
    }

    const parsed = parseQuantityInput(value);
    if (!parsed.isValid || parsed.value === null) {
      return {
        quantityFormat: true,
        quantityMessage: parsed.error ?? 'Invalid quantity format'
      };
    }

    if (!allowZero && parsed.value === 0) {
      return { quantityZeroNotAllowed: true };
    }

    if (min !== undefined && parsed.value < min) {
      return { quantityMin: { min, actual: parsed.value } };
    }

    if (max !== undefined && parsed.value > max) {
      return { quantityMax: { max, actual: parsed.value } };
    }

    return null;
  };
}

export function wholeNumberValidator(options: { required?: boolean; min?: number; max?: number } = {}): ValidatorFn {
  const {
    required = true,
    min,
    max
  } = options;

  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return required ? { wholeNumberRequired: true } : null;
    }

    const asNumber = Number(value);
    if (!Number.isInteger(asNumber)) {
      return { wholeNumberFormat: true };
    }

    if (min !== undefined && asNumber < min) {
      return { wholeNumberMin: { min, actual: asNumber } };
    }

    if (max !== undefined && asNumber > max) {
      return { wholeNumberMax: { max, actual: asNumber } };
    }

    return null;
  };
}