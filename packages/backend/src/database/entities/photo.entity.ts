import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Analysis } from './analysis.entity';
import { PhotoTag } from './photo-tag.entity';

export enum PhotoVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum OriginalFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  HEIC = 'heic',
}

@Entity('photos')
@Index('idx_photo_file_hash', ['fileHash'], { unique: true })
@Index('idx_photo_user_id', ['userId'])
@Index('idx_photo_category_id', ['categoryId'])
@Index('idx_photo_visibility', ['visibility'])
@Index('idx_photo_uploaded_at', ['uploadedAt'])
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @Column({ length: 255 })
  filename!: string;

  @Column({ type: 'enum', enum: OriginalFormat })
  originalFormat!: OriginalFormat;

  @Column({ type: 'varchar', length: 64 })
  fileHash!: string; // SHA-256 hash

  @Column({ type: 'integer' })
  fileSizeBytes!: number;

  @Column({ type: 'integer' })
  width!: number;

  @Column({ type: 'integer' })
  height!: number;

  @Column({ length: 500 })
  originalUrl!: string;

  @Column({ length: 500 })
  thumbnailUrl!: string;

  @Column({ length: 500 })
  mediumUrl!: string;

  @Column({
    type: 'enum',
    enum: PhotoVisibility,
    default: PhotoVisibility.PUBLIC,
  })
  visibility!: PhotoVisibility;

  @Column({ type: 'timestamp' })
  uploadedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.photos)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Category, (category) => category.photos, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category!: Category | null;

  @OneToOne(() => Analysis, (analysis) => analysis.photo)
  analysis!: Analysis;

  @OneToMany(() => PhotoTag, (photoTag) => photoTag.photo)
  photoTags!: PhotoTag[];
}
