import { BadRequestException } from '@nestjs/common';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class FileValidator {
  private static readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
  ];

  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  static validateImageFile(file: MulterFile): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate MIME type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${this.ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  static validateImageFiles(files: MulterFile[]): void {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    files.forEach((file, index) => {
      try {
        this.validateImageFile(file);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(
          `File ${index + 1} validation failed: ${message}`,
        );
      }
    });
  }

  static getFileExtension(mimetype: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
    };

    return mimeToExt[mimetype] || 'jpg';
  }
}
