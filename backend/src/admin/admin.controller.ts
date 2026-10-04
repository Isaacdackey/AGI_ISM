import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { Role } from '@prisma/client';
import { CreateModeratorDto } from './dto/create-moderator.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get('stats')
  stats() { return this.admin.stats(); }
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get('pending')
  pending() { return this.admin.pendingResources(); }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('moderators')
  createModerator(@Body() dto: CreateModeratorDto) {
    return this.admin.createModerator(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('moderators')
  listModerators() {
    return this.admin.listModerators();
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch('moderators/:id/disable')
  disableModerator(@Param('id') id: string, @CurrentUser() actor: { id: string }) {
    return this.admin.disableModerator(id, actor.id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Patch('moderators/:id/enable')
  enableModerator(@Param('id') id: string, @CurrentUser() actor: { id: string }) {
    return this.admin.enableModerator(id, actor.id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post('moderators/:id/reset-password')
  resetModeratorPassword(@Param('id') id: string, @CurrentUser() actor: { id: string }) {
    return this.admin.resetModeratorPassword(id, actor.id);
  }
}
