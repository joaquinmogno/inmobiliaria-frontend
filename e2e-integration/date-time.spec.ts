import { expect, test } from '@playwright/test';
import {
  currentMonthInput,
  formatDate,
  formatDateTime,
  getDaysFromToday,
  todayDateInput,
  toDateInputValue
} from '../src/utils/date';

test('fechas civiles y horarios usan Buenos Aires sin corrimientos UTC', () => {
  const afterNinePmArgentina = new Date('2026-10-01T01:30:00.000Z');

  expect(todayDateInput(afterNinePmArgentina)).toBe('2026-09-30');
  expect(currentMonthInput(afterNinePmArgentina)).toBe('2026-09');
  expect(formatDate('2026-09-01T00:00:00.000Z')).toBe('01/09/2026');
  expect(toDateInputValue('2026-09-01T00:00:00.000Z')).toBe('2026-09-01');
  expect(formatDateTime('2026-09-01T00:30:00.000Z')).toBe('31/08/2026 21:30');
  expect(getDaysFromToday('2026-09-01', new Date('2026-09-01T02:59:59.999Z'))).toBe(1);
});
