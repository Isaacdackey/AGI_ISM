import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@ApiTags('schools')
@Controller('schools')
export class SchoolsController {
  constructor(private schools: SchoolsService) {}
  @Public() @Get() @ApiQuery({ name: 'campusId', required: false }) findAll(@Query('campusId') campusId?: string) { return this.schools.findAll(campusId); }
  @Public() @Get(':slug') findOne(@Param('slug') slug: string) { return this.schools.findOne(slug); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Post() create(@Body() dto: CreateSchoolDto) { return this.schools.create(dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN, Role.MODERATOR) @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateSchoolDto, @CurrentUser() user: { role: Role }) { return this.schools.update(id, dto, user); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Delete(':id') remove(@Param('id') id: string) { return this.schools.remove(id); }
}
