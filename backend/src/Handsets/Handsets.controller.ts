import { Controller, Get } from '@nestjs/common';
import { HandsetResult, HandsetsService } from './Handsets.service';

@Controller('handsets')
export class HandsetsController {
  constructor(private readonly handsetsService: HandsetsService) {}

  @Get()
  async list(): Promise<HandsetResult[]> {
    return this.handsetsService.list();
  }
}
