import { Injectable, BadRequestException } from '@nestjs/common';
import { join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadsPath = join(process.cwd(), 'uploads', 'gallery');
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  // Magic bytes signatures for image file types
  private readonly magicBytes: Record<string, number[][]> = {
    'image/jpeg': [[0xff, 0xd8, 0xff]], // JPEG: FF D8 FF
    'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], // PNG: 89 50 4E 47 0D 0A 1A 0A
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // WebP: RIFF (52 49 46 46)
  };

  /**
   * Validates file content by checking magic bytes (file signature).
   * This prevents MIME type spoofing attacks.
   */
  private validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    const signatures = this.magicBytes[mimeType];
    if (!signatures) return false;

    return signatures.some((signature) => {
      if (buffer.length < signature.length) return false;
      return signature.every((byte, index) => buffer[index] === byte);
    });
  }

  async saveFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ filename: string; thumbnailPath: string }> {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, WebP',
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File too large. Max size: 10MB');
    }

    // Validate magic bytes to prevent MIME type spoofing
    if (!this.validateMagicBytes(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        'File content does not match declared type. Possible file spoofing detected.',
      );
    }

    const userDir = join(this.uploadsPath, userId);
    if (!existsSync(userDir)) {
      mkdirSync(userDir, { recursive: true });
    }

    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const uuid = uuidv4();
    const filename = `${uuid}${ext}`;
    const filepath = join(userDir, filename);

    // Save original file
    await sharp(file.buffer).toFile(filepath);

    // Generate thumbnail
    const thumbnailFilename = `${uuid}_thumb${ext}`;
    const thumbnailPath = join(userDir, thumbnailFilename);
    await this.generateThumbnail(file.buffer, thumbnailPath);

    return {
      filename,
      thumbnailPath: thumbnailFilename,
    };
  }

  private async generateThumbnail(
    buffer: Buffer,
    outputPath: string,
  ): Promise<void> {
    await sharp(buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
  }

  async deleteFile(filename: string, userId: string): Promise<void> {
    const userDir = join(this.uploadsPath, userId);
    const filepath = join(userDir, filename);

    if (existsSync(filepath)) {
      unlinkSync(filepath);
    }

    // Delete thumbnail
    const ext = extname(filename);
    const basename = filename.replace(ext, '');
    const thumbnailPath = join(userDir, `${basename}_thumb${ext}`);
    if (existsSync(thumbnailPath)) {
      unlinkSync(thumbnailPath);
    }
  }

  getImageUrl(filename: string, userId: string): string {
    return `/uploads/gallery/${userId}/${filename}`;
  }

  getThumbnailUrl(thumbnailPath: string | null, userId: string): string {
    if (!thumbnailPath) return '';
    return `/uploads/gallery/${userId}/${thumbnailPath}`;
  }
}
