import { aplicaAEspecialidad, diaSemana, motivoNoDisponible, type ReglasTurno } from './disponibilidad.js';

describe('disponibilidad de un turno', () => {
  const turno: ReglasTurno = {
    fechaInicio: '2026-12-01',
    fechaFin: '2026-12-31',
    diasNoDisponibles: ['sabado', 'domingo'],
    excluirFeriados: true,
  };

  it('calcula el día de la semana', () => {
    expect(diaSemana('2026-12-05')).toBe('sabado');
    expect(diaSemana('2026-12-07')).toBe('lunes');
  });

  it('acepta un día hábil dentro de la vigencia', () => {
    expect(motivoNoDisponible(turno, '2026-12-07', false)).toBeNull();
  });

  it('rechaza fuera de la vigencia', () => {
    expect(motivoNoDisponible(turno, '2026-11-30', false)).toMatch(/desde/);
    expect(motivoNoDisponible(turno, '2027-01-04', false)).toMatch(/hasta/);
    expect(motivoNoDisponible({ ...turno, fechaFin: null }, '2027-01-04', false)).toBeNull();
  });

  it('rechaza los días restringidos y los feriados', () => {
    expect(motivoNoDisponible(turno, '2026-12-05', false)).toMatch(/sábados/);
    expect(motivoNoDisponible(turno, '2026-12-08', true)).toMatch(/feriados/);
    expect(motivoNoDisponible({ ...turno, excluirFeriados: false }, '2026-12-08', true)).toBeNull();
  });

  it('compara especialidades sin mayúsculas, tildes ni espacios extra', () => {
    const t = { especialidades: ['Pediatría', 'Medicina Interna'] };
    expect(aplicaAEspecialidad(t, 'pediatria')).toBe(true);
    expect(aplicaAEspecialidad(t, ' Medicina  interna ')).toBe(true);
    expect(aplicaAEspecialidad(t, 'Cirugía General')).toBe(false);
  });
});
