import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Photo } from './photo.entity';
import { Tag } from './tag.entity';

export enum TagSource {
  AUTO = 'auto', // ML-generated
  MANUAL = 'manual', // User-added
}

@Entity('photo_tags')
@Index('idx_photo_tag_composite', ['photoId', 'tagId'], { unique: true })
@Index('idx_photo_tag_photo_id', ['photoId'])
@Index('idx_photo_tag_tag_id', ['tagId'])
@Index('idx_photo_tag_source', ['source'])
export class PhotoTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  photoId!: string;

  @Column({ type: 'uuid' })
  tagId!: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence!: number | null; // 0.00 - 1.00 (null for manual tags)

  @Column({ type: 'enum', enum: TagSource })
  source!: TagSource;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Photo, (photo) => photo.photoTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photoId' })
  photo!: Photo;

  @ManyToOne(() => Tag, (tag) => tag.photoTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag!: Tag;
}
