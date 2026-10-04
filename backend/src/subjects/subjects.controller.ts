import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@ApiTags('subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private subjects: SubjectsService) {}
  @Public() @Get() @ApiQuery({ name: 'schoolId', required: false }) @ApiQuery({ name: 'campusId', required: false }) findAll(@Query('schoolId') schoolId?: string, @Query('campusId') campusId?: string) { return this.subjects.findAll(schoolId, campusId); }
  @Public() @Get(':slug') findOne(@Param('slug') slug: string) { return this.subjects.findOne(slug); }
  @ApiBearerAuth() @Roles(Role.ADMIN, Role.MODERATOR) @Post() create(@Body() dto: CreateSubjectDto) { return this.subjects.create(dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN, Role.MODERATOR) @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateSubjectDto, @CurrentUser() user: { role: Role }) { return this.subjects.update(id, dto, user); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Delete(':id') remove(@Param('id') id: string) { return this.subjects.remove(id); }
}
