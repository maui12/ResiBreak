import { cumpleAnticipacion } from './anticipacion.js';

describe('cumpleAnticipacion', () => {
  // jueves 29 oct 2026, 14:05 (hora local del servidor)
  const ahora = new Date(2026, 9, 29, 14, 5).getTime();

  it('rechaza hoy, mañana (queda a menos de 24 h) y el pasado', () => {
    expect(cumpleAnticipacion('2026-10-29', 24, ahora)).toBe(false);
    expect(cumpleAnticipacion('2026-10-30', 24, ahora)).toBe(false);
    expect(cumpleAnticipacion('2026-10-01', 24, ahora)).toBe(false);
  });

  it('acepta desde pasado mañana', () => {
    expect(cumpleAnticipacion('2026-10-31', 24, ahora)).toBe(true);
    expect(cumpleAnticipacion('2026-12-25', 24, ahora)).toBe(true);
  });

  it('acepta justo a la hora límite', () => {
    const medianoche = new Date(2026, 9, 29, 0, 0).getTime();
    expect(cumpleAnticipacion('2026-10-30', 24, medianoche)).toBe(true);
  });
});