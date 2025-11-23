import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../database/entities/category.entity';
import {
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@miya-dairy/shared';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createData: CreateCategoryRequest): Promise<CategoryDto> {
    const slug = this.generateSlug(createData.name);

    // Check if slug already exists
    const existing = await this.categoryRepository.findOne({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(
        `Category with name "${createData.name}" already exists`,
      );
    }

    const category = this.categoryRepository.create({
      name: createData.name,
      slug,
      description: createData.description || null,
      photoCount: 0,
    });

    const saved = await this.categoryRepository.save(category);

    return this.toCategoryDto(saved);
  }

  async findAll(): Promise<CategoryDto[]> {
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .loadRelationCountAndMap('category.photoCount', 'category.photos')
      .orderBy('category.name', 'ASC')
      .getMany();

    return categories.map((c) => this.toCategoryDto(c));
  }

  async findOne(id: string): Promise<CategoryDto> {
    const category = await this.categoryRepository
      .createQueryBuilder('category')
      .where('category.id = :id', { id })
      .loadRelationCountAndMap('category.photoCount', 'category.photos')
      .getOne();

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.toCategoryDto(category);
  }

  async update(
    id: string,
    updateData: UpdateCategoryRequest,
  ): Promise<CategoryDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (updateData.name) {
      category.name = updateData.name;
      category.slug = this.generateSlug(updateData.name);
    }

    if (updateData.description !== undefined) {
      category.description = updateData.description;
    }

    // Handle isDefault flag
    if (updateData.isDefault !== undefined) {
      if (updateData.isDefault) {
        // If setting this category as default, unset all other defaults
        await this.categoryRepository.update(
          { isDefault: true },
          { isDefault: false },
        );
      }
      category.isDefault = updateData.isDefault;
    }

    const updated = await this.categoryRepository.save(category);

    return this.toCategoryDto(updated);
  }

  async delete(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Set photos in this category to null (no category)
    await this.categoryRepository.manager.query(
      `UPDATE photos SET "categoryId" = NULL WHERE "categoryId" = $1`,
      [id],
    );

    await this.categoryRepository.remove(category);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toCategoryDto(category: Category): CategoryDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      photoCount: category.photoCount,
      isDefault: category.isDefault,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
