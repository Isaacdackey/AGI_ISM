import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CampusesService } from './campuses.service';
import { CreateCampusDto } from './dto/create-campus.dto';
import { UpdateCampusDto } from './dto/update-campus.dto';

@ApiTags('campuses')
@Controller('campuses')
export class CampusesController {
  constructor(private campuses: CampusesService) {}
  @Public() @Get() findAll() { return this.campuses.findAll(); }
  @Public() @Get(':slug') findOne(@Param('slug') slug: string) { return this.campuses.findOne(slug); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Post() create(@Body() dto: CreateCampusDto) { return this.campuses.create(dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCampusDto) { return this.campuses.update(id, dto); }
  @ApiBearerAuth() @Roles(Role.ADMIN) @Delete(':id') remove(@Param('id') id: string) { return this.campuses.remove(id); }
}
