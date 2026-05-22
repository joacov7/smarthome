import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Room } from './room.entity';

@Entity('guayhome_devices')
@Index(['tenantId', 'deviceId'], { unique: true })
export class HomeDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  // The core Device UUID from the devices table
  @Column()
  deviceId: string;

  // FK to guayhome_rooms.id — nullable, SET NULL on room delete
  @Column({ nullable: true })
  roomId: string;

  @ManyToOne(() => Room, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  // Display name override for UI (overrides core device name)
  @Column({ nullable: true })
  displayName: string;

  // Icon identifier e.g. 'thermostat', 'light-bulb', 'door-lock'
  @Column({ nullable: true })
  icon: string;

  @Column({ default: 0 })
  sortOrder: number;

  // Declared capabilities e.g. ['on_off', 'dimmer', 'color']
  @Column({ type: 'jsonb', default: [] })
  capabilities: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
