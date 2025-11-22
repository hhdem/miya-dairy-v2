import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: 'jpeg' | 'png' | 'webp';
}

export interface ImageProcessingResult {
  original: ProcessedImage;
  thumbnail: ProcessedImage;
  medium: ProcessedImage;
}

@Injectable()
export class PhotoProcessingService {
  private readonly logger = new Logger(PhotoProcessingService.name);

  async processImage(
    buffer: Buffer,
    originalFormat: 'jpeg' | 'png' | 'webp' | 'heic',
  ): Promise<ImageProcessingResult> {
    const startTime = Date.now();

    try {
      // Load image with sharp
      let sharpInstance = sharp(buffer);

      // Convert HEIC to JPEG if needed
      if (originalFormat === 'heic') {
        this.logger.log('Converting HEIC to JPEG');
        sharpInstance = sharpInstance.jpeg({ quality: 95 });
      }

      // Get original metadata
      const metadata = await sharpInstance.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Process original (convert to JPEG for consistency)
      const originalBuffer = await sharpInstance
        .jpeg({ quality: 95, mozjpeg: true })
        .toBuffer();

      // Generate thumbnail (300px max dimension)
      const thumbnailBuffer = await sharp(buffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

      // Generate medium size (1200px max dimension)
      const mediumBuffer = await sharp(buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      const mediumMetadata = await sharp(mediumBuffer).metadata();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Image processing completed in ${duration}ms (${width}x${height})`,
      );

      return {
        original: {
          buffer: originalBuffer,
          width,
          height,
          format: 'jpeg',
        },
        thumbnail: {
          buffer: thumbnailBuffer,
          width: thumbnailMetadata.width || 0,
          height: thumbnailMetadata.height || 0,
          format: 'jpeg',
        },
        medium: {
          buffer: mediumBuffer,
          width: mediumMetadata.width || 0,
          height: mediumMetadata.height || 0,
          format: 'jpeg',
        },
      };
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      throw error;
    }
  }

  async extractColors(buffer: Buffer): Promise<{
    dominantColor: string;
    colorPalette: string[];
  }> {
    try {
      // Resize to small size for faster color extraction
      const smallImage = await sharp(buffer)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Simple color extraction (get most common colors)
      // In production, you might want to use a more sophisticated algorithm
      const colors = new Map<string, number>();
      const { data, info } = smallImage;

      for (let i = 0; i < data.length; i += info.channels * 10) {
        // Sample every 10 pixels
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Convert to hex
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        colors.set(hex, (colors.get(hex) || 0) + 1);
      }

      // Get top colors
      const sortedColors = Array.from(colors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color]) => color);

      return {
        dominantColor: sortedColors[0] || '#000000',
        colorPalette: sortedColors,
      };
    } catch (error) {
      this.logger.error('Color extraction failed:', error);
      return {
        dominantColor: '#000000',
        colorPalette: ['#000000'],
      };
    }
  }

  detectFormat(buffer: Buffer): 'jpeg' | 'png' | 'webp' | 'heic' {
    // Check magic numbers
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
    if (buffer[8] === 0x57 && buffer[9] === 0x45) return 'webp';
    if (
      buffer.slice(4, 12).toString() === 'ftypheic' ||
      buffer.slice(4, 12).toString() === 'ftypheix'
    ) {
      return 'heic';
    }

    // Default to jpeg
    return 'jpeg';
  }
}
