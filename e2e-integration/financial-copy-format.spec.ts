import { expect, test } from '@playwright/test';
import { formatCurrency, formatSignedCurrency } from '../src/utils/currency';

test('los importes financieros mantienen símbolo, signo y separadores consistentes', () => {
  expect(formatCurrency(-17345, 'ARS')).toBe('-$17.345');
  expect(formatCurrency(-1299.99, 'USD')).toBe('-US$1.299,99');
  expect(formatCurrency(17345, 'ARS')).toBe('$17.345');
  expect(formatSignedCurrency(17345, 'ARS', true)).toBe('+$17.345');
  expect(formatSignedCurrency(-17345, 'ARS', true)).toBe('-$17.345');
});
