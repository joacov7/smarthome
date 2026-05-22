import { Entity, Column, Index, PrimaryColumn } from 'typeorm';

// ── TimescaleDB hypertable ────────────────────────────────────
// Esta tabla se convierte en hypertable en la migración SQL.
// NO usar PrimaryGeneratedColumn — TimescaleDB necesita ts como parte del PK.
// Particionado automáticamente por ts (chunks de 1 día en producción).
// Compresión automática habilitada para chunks > 7 días.

@Entity('telemetry')
@Index(['tenantId', 'deviceId', 'ts'])      // query por dispositivo + rango
@Index(['tenantId', 'ts'])                   // query por tenant + rango
export class Telemetry {
  // ts + deviceId forman la PK compuesta (requerido por TimescaleDB)
  @PrimaryColumn({ type: 'timestamptz' })
  ts: Date;

  @PrimaryColumn()
  deviceId: string;

  @Column()
  @Index()
  tenantId: string;

  // Payload libre — cada vertical define su schema
  // Ej guayhome: { relay1: true, temp: 22.4 }
  // Ej logiguay: { lat: -34.6, lng: -58.4, speed: 80, heading: 270 }
  // Ej guaycold: { temp: -18.2, humidity: 65, door: false }
  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;

  // Señal del dispositivo (útil para diagnóstico)
  @Column({ nullable: true })
  rssi: number;
}
