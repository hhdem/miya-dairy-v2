import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { PhotoProcessingService } from './services/photo-processing.service';
import { StorageService } from './services/storage.service';
import { MlAnalysisService } from './services/ml-analysis.service';
import { YoloDetectionService } from './services/yolo-detection.service';
import { FaceEmotionService } from './services/face-emotion.service';
import { Photo } from '../database/entities/photo.entity';
import { Category } from '../database/entities/category.entity';
import { Tag } from '../database/entities/tag.entity';
import { PhotoTag } from '../database/entities/photo-tag.entity';
import { Analysis } from '../database/entities/analysis.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo, Category, Tag, PhotoTag, Analysis]),
    MulterModule.register({
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
    }),
  ],
  controllers: [PhotosController],
  providers: [
    PhotosService,
    PhotoProcessingService,
    StorageService,
    MlAnalysisService,
    YoloDetectionService,
    FaceEmotionService,
  ],
  exports: [PhotosService],
})
export class PhotosModule {}
