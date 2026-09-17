import { Global, Module } from '@nestjs/common';
import { JobsService } from './Jobs.service';

@Global()
@Module({
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}