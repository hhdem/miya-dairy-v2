import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') ||
      path.join(process.cwd(), '../../uploads');
  }

  async init(): Promise<void> {
    // Create upload directories if they don't exist
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'original'),
      path.join(this.uploadDir, 'thumbnail'),
      path.join(this.uploadDir, 'medium'),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    this.logger.log(`Upload directories initialized at ${this.uploadDir}`);
  }

  async saveFile(
    buffer: Buffer,
    filename: string,
    type: 'original' | 'thumbnail' | 'medium',
  ): Promise<string> {
    const targetDir = path.join(this.uploadDir, type);
    const filePath = path.join(targetDir, filename);

    await fs.writeFile(filePath, buffer);

    // Return relative URL path
    return `/uploads/${type}/${filename}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      // Convert URL path to file system path
      const relativePath = filePath.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.uploadDir, relativePath);
      await fs.unlink(fullPath);
      this.logger.log(`Deleted file: ${fullPath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${filePath}:`, error);
    }
  }

  async deletePhotoFiles(
    originalUrl: string,
    thumbnailUrl: string,
    mediumUrl: string,
  ): Promise<void> {
    await Promise.all([
      this.deleteFile(originalUrl),
      this.deleteFile(thumbnailUrl),
      this.deleteFile(mediumUrl),
    ]);
  }

  calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  generateFilename(hash: string, extension: string): string {
    return `${hash}.${extension}`;
  }
}
