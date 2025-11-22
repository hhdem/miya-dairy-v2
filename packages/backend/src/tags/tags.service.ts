import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '../database/entities/tag.entity';
import { PhotoTag, TagSource } from '../database/entities/photo-tag.entity';
import { TagDto, AddTagRequest } from '@miya-dairy/shared';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(PhotoTag)
    private readonly photoTagRepository: Repository<PhotoTag>,
  ) {}

  async findAll(): Promise<TagDto[]> {
    const tags = await this.tagRepository.find({
      order: { photoCount: 'DESC' },
    });

    return tags.map((t) => this.toTagDto(t));
  }

  async findOne(id: string): Promise<TagDto> {
    const tag = await this.tagRepository.findOne({ where: { id } });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return this.toTagDto(tag);
  }

  async addTagToPhoto(
    photoId: string,
    addTagData: AddTagRequest,
  ): Promise<TagDto> {
    const slug = this.generateSlug(addTagData.tagName);

    // Find or create tag
    let tag = await this.tagRepository.findOne({ where: { slug } });

    if (!tag) {
      tag = this.tagRepository.create({
        name: addTagData.tagName,
        slug,
        photoCount: 0,
      });
      tag = await this.tagRepository.save(tag);
    }

    // Check if association already exists
    const existing = await this.photoTagRepository.findOne({
      where: { photoId, tagId: tag.id },
    });

    if (existing) {
      throw new ConflictException('This tag is already added to the photo');
    }

    // Create photo-tag association (manual)
    const photoTag = this.photoTagRepository.create({
      photoId,
      tagId: tag.id,
      confidence: null,
      source: TagSource.MANUAL,
    });

    await this.photoTagRepository.save(photoTag);

    // Update tag photo count
    await this.tagRepository.increment({ id: tag.id }, 'photoCount', 1);

    return this.toTagDto(tag);
  }

  async removeTagFromPhoto(photoId: string, tagId: string): Promise<void> {
    const photoTag = await this.photoTagRepository.findOne({
      where: { photoId, tagId },
    });

    if (!photoTag) {
      throw new NotFoundException('Tag association not found');
    }

    await this.photoTagRepository.remove(photoTag);

    // Update tag photo count
    await this.tagRepository.decrement({ id: tagId }, 'photoCount', 1);

    // Delete tag if photo count is 0
    const tag = await this.tagRepository.findOne({ where: { id: tagId } });
    if (tag && tag.photoCount <= 0) {
      await this.tagRepository.remove(tag);
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toTagDto(tag: Tag): TagDto {
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt,
    };
  }
}
