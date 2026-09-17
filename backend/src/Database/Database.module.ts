import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './Database.service';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}