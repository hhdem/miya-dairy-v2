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
    const categories = await this.categoryRepository.find({
      order: { name: 'ASC' },
    });

    return categories.map((c) => this.toCategoryDto(c));
  }

  async findOne(id: string): Promise<CategoryDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

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

    // Prevent updating the uncategorized category
    if (category.slug === 'uncategorized') {
      throw new ConflictException('Cannot update the Uncategorized category');
    }

    if (updateData.name) {
      category.name = updateData.name;
      category.slug = this.generateSlug(updateData.name);
    }

    if (updateData.description !== undefined) {
      category.description = updateData.description;
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

    // Prevent deleting the uncategorized category
    if (category.slug === 'uncategorized') {
      throw new ConflictException('Cannot delete the Uncategorized category');
    }

    // Get uncategorized category for reassignment
    const uncategorized = await this.categoryRepository.findOne({
      where: { slug: 'uncategorized' },
    });

    if (!uncategorized) {
      throw new Error('Uncategorized category not found');
    }

    // Reassign photos to uncategorized
    await this.categoryRepository.manager.query(
      `UPDATE photos SET "categoryId" = $1 WHERE "categoryId" = $2`,
      [uncategorized.id, id],
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
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
