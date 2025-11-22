import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { Tag } from '../database/entities/tag.entity';
import { PhotoTag } from '../database/entities/photo-tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, PhotoTag])],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
