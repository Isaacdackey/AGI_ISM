import { Module } from '@nestjs/common';
import { CampusesService } from './campuses.service';
import { CampusesController } from './campuses.controller';
@Module({ providers: [CampusesService], controllers: [CampusesController] })
export class CampusesModule {}
