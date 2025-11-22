import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo, PhotoVisibility, OriginalFormat } from '../database/entities/photo.entity';
import { Category } from '../database/entities/category.entity';
import { Tag } from '../database/entities/tag.entity';
import { PhotoTag, TagSource } from '../database/entities/photo-tag.entity';
import { Analysis } from '../database/entities/analysis.entity';
import { StorageService } from './services/storage.service';
import { PhotoProcessingService } from './services/photo-processing.service';
import { MlAnalysisService } from './services/ml-analysis.service';
import {
  PhotoDto,
  PhotoListResponse,
  UpdatePhotoRequest,
} from '@miya-dairy/shared';

interface UploadPhotoParams {
  buffer: Buffer;
  originalFilename: string;
  mimetype: string;
  userId: string;
}

@Injectable()
export class PhotosService implements OnModuleInit {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(PhotoTag)
    private readonly photoTagRepository: Repository<PhotoTag>,
    @InjectRepository(Analysis)
    private readonly analysisRepository: Repository<Analysis>,
    private readonly storageService: StorageService,
    private readonly processingService: PhotoProcessingService,
    private readonly mlService: MlAnalysisService,
  ) {}

  async onModuleInit() {
    await this.storageService.init();
    await this.mlService.init();
  }

  async uploadPhoto(params: UploadPhotoParams): Promise<PhotoDto> {
    const { buffer, originalFilename, userId } = params;

    // Calculate file hash for duplicate detection
    const fileHash = this.storageService.calculateFileHash(buffer);

    // Check for duplicate
    const existingPhoto = await this.photoRepository.findOne({
      where: { fileHash },
    });

    if (existingPhoto) {
      throw new ConflictException(
        'This photo has already been uploaded (duplicate detected)',
      );
    }

    // Detect original format
    const originalFormat = this.processingService.detectFormat(buffer);

    // Process image (resize, convert HEIC, etc.)
    const processed = await this.processingService.processImage(
      buffer,
      originalFormat,
    );

    // Generate filenames
    const originalFilename_generated = this.storageService.generateFilename(
      fileHash,
      'jpg',
    );
    const thumbnailFilename = this.storageService.generateFilename(
      `${fileHash}_thumb`,
      'jpg',
    );
    const mediumFilename = this.storageService.generateFilename(
      `${fileHash}_medium`,
      'jpg',
    );

    // Save files
    const [originalUrl, thumbnailUrl, mediumUrl] = await Promise.all([
      this.storageService.saveFile(
        processed.original.buffer,
        originalFilename_generated,
        'original',
      ),
      this.storageService.saveFile(
        processed.thumbnail.buffer,
        thumbnailFilename,
        'thumbnail',
      ),
      this.storageService.saveFile(
        processed.medium.buffer,
        mediumFilename,
        'medium',
      ),
    ]);

    // Get uncategorized category
    const uncategorizedCategory = await this.categoryRepository.findOne({
      where: { slug: 'uncategorized' },
    });

    // Create photo record
    const photo = this.photoRepository.create({
      userId,
      categoryId: uncategorizedCategory?.id || null,
      filename: originalFilename,
      originalFormat: originalFormat as OriginalFormat,
      fileHash,
      fileSizeBytes: buffer.length,
      width: processed.original.width,
      height: processed.original.height,
      originalUrl,
      thumbnailUrl,
      mediumUrl,
      visibility: PhotoVisibility.PUBLIC,
      uploadedAt: new Date(),
    });

    const savedPhoto = await this.photoRepository.save(photo);

    // Run ML analysis asynchronously
    this.runMlAnalysis(savedPhoto.id, processed.original.buffer).catch(
      (error) => {
        this.logger.error(
          `ML analysis failed for photo ${savedPhoto.id}:`,
          error,
        );
      },
    );

    return this.toPhotoDto(savedPhoto);
  }

  private async runMlAnalysis(
    photoId: string,
    buffer: Buffer,
  ): Promise<void> {
    try {
      // Run ML analysis
      const mlResult = await this.mlService.analyzeImage(buffer);

      // Extract colors
      const { dominantColor, colorPalette } =
        await this.processingService.extractColors(buffer);

      // Save analysis
      const analysis = this.analysisRepository.create({
        photoId,
        modelVersion: mlResult.modelVersion,
        rawResults: mlResult.rawResults,
        dominantColor,
        colorPalette,
        analyzedAt: new Date(),
        processingTimeMs: mlResult.processingTimeMs,
      });

      await this.analysisRepository.save(analysis);

      // Create or get tags and associate with photo
      await this.createAutoTags(photoId, mlResult.tags);

      this.logger.log(
        `ML analysis completed for photo ${photoId}: ${mlResult.tags.length} tags found`,
      );
    } catch (error) {
      this.logger.error(`ML analysis failed for photo ${photoId}:`, error);
      throw error;
    }
  }

  private async createAutoTags(
    photoId: string,
    mlTags: Array<{ tag: string; confidence: number }>,
  ): Promise<void> {
    for (const mlTag of mlTags) {
      // Generate slug
      const slug = mlTag.tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Find or create tag
      let tag = await this.tagRepository.findOne({ where: { slug } });

      if (!tag) {
        tag = this.tagRepository.create({
          name: mlTag.tag,
          slug,
          photoCount: 0,
        });
        tag = await this.tagRepository.save(tag);
      }

      // Create photo-tag association
      const photoTag = this.photoTagRepository.create({
        photoId,
        tagId: tag.id,
        confidence: mlTag.confidence,
        source: TagSource.AUTO,
      });

      await this.photoTagRepository.save(photoTag);

      // Update tag photo count
      await this.tagRepository.increment({ id: tag.id }, 'photoCount', 1);
    }
  }

  async findAll(
    page = 1,
    limit = 20,
    categoryId?: string,
  ): Promise<PhotoListResponse> {
    const query = this.photoRepository
      .createQueryBuilder('photo')
      .leftJoinAndSelect('photo.category', 'category')
      .leftJoinAndSelect('photo.photoTags', 'photoTags')
      .leftJoinAndSelect('photoTags.tag', 'tag')
      .orderBy('photo.uploadedAt', 'DESC');

    if (categoryId) {
      query.where('photo.categoryId = :categoryId', { categoryId });
    }

    const [photos, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: photos.map((p) => this.toPhotoDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PhotoDto> {
    const photo = await this.photoRepository.findOne({
      where: { id },
      relations: ['category', 'photoTags', 'photoTags.tag', 'analysis'],
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    return this.toPhotoDto(photo);
  }

  async update(id: string, updateData: UpdatePhotoRequest): Promise<PhotoDto> {
    const photo = await this.photoRepository.findOne({ where: { id } });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    // Update category if provided
    if (updateData.categoryId !== undefined) {
      photo.categoryId = updateData.categoryId;
    }

    // Update visibility if provided
    if (updateData.visibility) {
      photo.visibility = updateData.visibility as PhotoVisibility;
    }

    const updatedPhoto = await this.photoRepository.save(photo);

    return this.toPhotoDto(updatedPhoto);
  }

  async delete(id: string): Promise<void> {
    const photo = await this.photoRepository.findOne({ where: { id } });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    // Delete files
    await this.storageService.deletePhotoFiles(
      photo.originalUrl,
      photo.thumbnailUrl,
      photo.mediumUrl,
    );

    // Delete from database (cascades to analysis and photo_tags)
    await this.photoRepository.remove(photo);
  }

  private toPhotoDto(photo: Photo): PhotoDto {
    return {
      id: photo.id,
      filename: photo.filename,
      originalFormat: photo.originalFormat,
      fileHash: photo.fileHash,
      fileSizeBytes: photo.fileSizeBytes,
      width: photo.width,
      height: photo.height,
      originalUrl: photo.originalUrl,
      thumbnailUrl: photo.thumbnailUrl,
      mediumUrl: photo.mediumUrl,
      visibility: photo.visibility,
      uploadedAt: photo.uploadedAt,
      createdAt: photo.createdAt,
      updatedAt: photo.updatedAt,
      category: photo.category
        ? {
            id: photo.category.id,
            name: photo.category.name,
            slug: photo.category.slug,
            description: photo.category.description || undefined,
            photoCount: photo.category.photoCount,
            createdAt: photo.category.createdAt,
            updatedAt: photo.category.updatedAt,
          }
        : undefined,
      tags: photo.photoTags
        ? photo.photoTags.map((pt) => ({
            id: pt.id,
            tag: {
              id: pt.tag.id,
              name: pt.tag.name,
              slug: pt.tag.slug,
              createdAt: pt.tag.createdAt,
            },
            confidence: pt.confidence || undefined,
            source: pt.source,
            createdAt: pt.createdAt,
          }))
        : undefined,
    };
  }
}
