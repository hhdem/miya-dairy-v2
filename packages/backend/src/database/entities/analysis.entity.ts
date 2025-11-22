import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Photo } from './photo.entity';

@Entity('analyses')
@Index('idx_analysis_photo_id', ['photoId'], { unique: true })
export class Analysis {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  photoId!: string;

  @Column({ length: 50 })
  modelVersion!: string; // e.g., "mobilenet-v2-1.0"

  @Column({ type: 'jsonb' })
  rawResults!: Record<string, any>; // Full ML output

  @Column({ type: 'varchar', length: 7 })
  dominantColor!: string; // Hex color (e.g., "#FF5733")

  @Column({ type: 'jsonb' })
  colorPalette!: string[]; // Array of hex colors

  @Column({ type: 'timestamp' })
  analyzedAt!: Date;

  @Column({ type: 'integer' })
  processingTimeMs!: number; // ML inference time

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @OneToOne(() => Photo, (photo) => photo.analysis, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photoId' })
  photo!: Photo;
}
