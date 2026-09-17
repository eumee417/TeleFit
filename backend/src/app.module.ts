import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './Database/Database.module';
import { JobsModule } from './Jobs/Jobs.module';
import { PlansModule } from './Plans/Plans.module';
import { RecommendModule } from './Recommend/Recommend.module';
import { CalculateModule } from './Calculate/Calculate.module';
import { HandsetsModule } from './Handsets/Handsets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    JobsModule,
    PlansModule,
    RecommendModule,
    CalculateModule,
    HandsetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
