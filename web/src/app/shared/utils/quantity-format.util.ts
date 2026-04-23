export interface ParsedQuantityResult {
  isValid: boolean;
  value: number | null;
  normalizedInput: string;
  error?: string;
}

const WHOLE_NUMBER_PATTERN = /^-?\d+$/;
const DECIMAL_PATTERN = /^-?(?:\d+\.\d+|\d+|\.\d+)$/;
const FRACTION_PATTERN = /^-?\d+\s*\/\s*\d+$/;
const MIXED_FRACTION_PATTERN = /^-?\d+\s+\d+\s*\/\s*\d+$/;

export function parseQuantityInput(input: unknown): ParsedQuantityResult {
  if (input === null || input === undefined) {
    return {
      isValid: false,
      value: null,
      normalizedInput: '',
      error: 'Quantity is required'
    };
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      return {
        isValid: false,
        value: null,
        normalizedInput: '',
        error: 'Quantity must be a valid number'
      };
    }

    return {
      isValid: true,
      value: input,
      normalizedInput: input.toString()
    };
  }

  const normalizedInput = String(input).trim().replace(/\s+/g, ' ');

  if (!normalizedInput) {
    return {
      isValid: false,
      value: null,
      normalizedInput,
      error: 'Quantity is required'
    };
  }

  if (WHOLE_NUMBER_PATTERN.test(normalizedInput) || DECIMAL_PATTERN.test(normalizedInput)) {
    const value = Number(normalizedInput);
    if (!Number.isFinite(value)) {
      return {
        isValid: false,
        value: null,
        normalizedInput,
        error: 'Quantity must be a valid number'
      };
    }

    return {
      isValid: true,
      value,
      normalizedInput
    };
  }

  if (FRACTION_PATTERN.test(normalizedInput)) {
    const [rawNumerator, rawDenominator] = normalizedInput.split('/').map(part => part.trim());
    const numerator = Number(rawNumerator);
    const denominator = Number(rawDenominator);

    if (denominator === 0) {
      return {
        isValid: false,
        value: null,
        normalizedInput,
        error: 'Fraction denominator cannot be zero'
      };
    }

    return {
      isValid: true,
      value: numerator / denominator,
      normalizedInput
    };
  }

  if (MIXED_FRACTION_PATTERN.test(normalizedInput)) {
    const [rawWhole, rawFraction] = normalizedInput.split(' ');
    const [rawNumerator, rawDenominator] = rawFraction.split('/').map(part => part.trim());

    const whole = Number(rawWhole);
    const numerator = Number(rawNumerator);
    const denominator = Number(rawDenominator);

    if (denominator === 0) {
      return {
        isValid: false,
        value: null,
        normalizedInput,
        error: 'Fraction denominator cannot be zero'
      };
    }

    const absoluteWhole = Math.abs(whole);
    const fractionValue = numerator / denominator;
    const value = whole < 0 ? -(absoluteWhole + fractionValue) : absoluteWhole + fractionValue;

    return {
      isValid: true,
      value,
      normalizedInput
    };
  }

  return {
    isValid: false,
    value: null,
    normalizedInput,
    error: 'Use whole numbers, decimals, fractions (1/2), or mixed fractions (1 1/2)'
  };
}

export function formatAsFraction(value: number, maxDenominator: number = 16): string {
  if (!Number.isFinite(value)) {
    return '';
  }

  const isNegative = value < 0;
  const absoluteValue = Math.abs(value);
  const whole = Math.floor(absoluteValue);
  const fractional = absoluteValue - whole;

  if (fractional === 0) {
    return `${isNegative ? '-' : ''}${whole}`;
  }

  let bestNumerator = 0;
  let bestDenominator = 1;
  let smallestDiff = Number.MAX_VALUE;

  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(fractional * denominator);
    const approximation = numerator / denominator;
    const diff = Math.abs(fractional - approximation);

    if (diff < smallestDiff) {
      smallestDiff = diff;
      bestNumerator = numerator;
      bestDenominator = denominator;
    }
  }

  if (bestNumerator === 0) {
    return `${isNegative ? '-' : ''}${whole}`;
  }

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(bestNumerator, bestDenominator);
  const reducedNumerator = bestNumerator / divisor;
  const reducedDenominator = bestDenominator / divisor;

  if (whole === 0) {
    return `${isNegative ? '-' : ''}${reducedNumerator}/${reducedDenominator}`;
  }

  return `${isNegative ? '-' : ''}${whole} ${reducedNumerator}/${reducedDenominator}`;
}