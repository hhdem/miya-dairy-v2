import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { TagDto, AddTagRequest } from '@miya-dairy/shared';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  async findAll(): Promise<TagDto[]> {
    return this.tagsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TagDto> {
    return this.tagsService.findOne(id);
  }

  @Post('photos/:photoId')
  @UseGuards(JwtAuthGuard)
  async addTagToPhoto(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Body() addTagData: AddTagRequest,
  ): Promise<TagDto> {
    return this.tagsService.addTagToPhoto(photoId, addTagData);
  }

  @Delete('photos/:photoId/:tagId')
  @UseGuards(JwtAuthGuard)
  async removeTagFromPhoto(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ): Promise<void> {
    return this.tagsService.removeTagFromPhoto(photoId, tagId);
  }
}
