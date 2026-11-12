import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Configuración del sistema: una sola fila (id = 1). Cada valor se lee en el momento en que se usa,
 * así que un cambio se aplica de inmediato en todo el sistema.
 *
 * Para agregar una configuración nueva:
 *   1. Agregar la columna aquí, con un `default` (así la fila existente la recibe sola).
 *   2. Agregar el campo, con sus validaciones, en dto/actualizar-configuracion.dto.ts.
 *   3. Usarla donde corresponda leyendo ConfiguracionService.obtener().
 *   4. En la app móvil, agregar su entrada en src/constants/configuracion.ts (la pantalla se arma sola).
 */
@Entity('configuracion')
export class Configuracion {
  @PrimaryColumn({ type: 'int' })
  id: number;

  /** Alerta del panel: becados con más turnos que esto en el mes. No bloquea. */
  @Column({ type: 'int', default: 6 })
  maxTurnosMes: number;

  /** Horas mínimas entre ahora y el inicio (00:00) del día para agendar, cambiar o cancelar un pedido. */
  @Column({ type: 'int', default: 24 })
  anticipacionMinimaHoras: number;

  /** Sin uso por ahora (los hospitales se eligen en cada pedido). Se conserva por compatibilidad. */
  @Column({ type: 'varchar', length: 80, default: 'Ovalle' })
  hospitalActivo: string;

  // Costos en pesos chilenos (enteros, CLP no usa decimales). Se copian al pedido al crearlo:
  // cambiarlos solo afecta a los pedidos futuros.
  @Column({ type: 'int', default: 4200 })
  costoDesayuno: number;

  @Column({ type: 'int', default: 6500 })
  costoAlmuerzo: number;

  @Column({ type: 'int', default: 3800 })
  costoOnce: number;

  @Column({ type: 'int', default: 6200 })
  costoCena: number;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
