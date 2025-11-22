import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotosService } from './photos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { FileValidator } from '../common/validators/file.validator';
import {
  PhotoDto,
  PhotoListResponse,
  UpdatePhotoRequest,
} from '@miya-dairy/shared';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @UploadedFile() file: MulterFile,
    @CurrentUser('sub') userId: string,
  ): Promise<PhotoDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file
    FileValidator.validateImageFile(file);

    return this.photosService.uploadPhoto({
      buffer: file.buffer,
      originalFilename: file.originalname,
      mimetype: file.mimetype,
      userId,
    });
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('categoryId') categoryId?: string,
  ): Promise<PhotoListResponse> {
    return this.photosService.findAll(page, limit, categoryId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PhotoDto> {
    return this.photosService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: UpdatePhotoRequest,
  ): Promise<PhotoDto> {
    return this.photosService.update(id, updateData);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.photosService.delete(id);
  }
}
