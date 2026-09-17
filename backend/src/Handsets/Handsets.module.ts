import { Module } from '@nestjs/common';
import { HandsetsController } from './Handsets.controller';
import { HandsetsService } from './Handsets.service';

@Module({
  controllers: [HandsetsController],
  providers: [HandsetsService],
})
export class HandsetsModule {}
