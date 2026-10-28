import { isTenantNotificationHour } from './tenant-notification-hours';

// Plage 7 h inclus – 21 h exclu, heure de Lomé (= UTC toute l'année).
describe('isTenantNotificationHour', () => {
  it.each([
    ['2026-10-16T06:59:59.999Z', false],
    ['2026-10-16T07:00:00.000Z', true],
    ['2026-10-16T12:30:00.000Z', true],
    ['2026-10-16T20:59:59.999Z', true],
    ['2026-10-16T21:00:00.000Z', false],
    ['2026-10-16T02:00:00.000Z', false],
    ['2026-10-16T23:59:00.000Z', false],
  ])('%s → %s', (iso, expected) => {
    expect(isTenantNotificationHour(new Date(iso))).toBe(expected);
  });
});
