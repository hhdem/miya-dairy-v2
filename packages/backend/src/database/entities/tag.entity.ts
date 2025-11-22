import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PhotoTag } from './photo-tag.entity';

@Entity('tags')
@Index('idx_tag_slug', ['slug'], { unique: true })
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50 })
  name!: string;

  @Column({ length: 50 })
  slug!: string; // URL-friendly

  @Column({ type: 'integer', default: 0 })
  photoCount!: number; // Denormalized for performance

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => PhotoTag, (photoTag) => photoTag.tag)
  photoTags!: PhotoTag[];
}
