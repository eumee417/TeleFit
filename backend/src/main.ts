import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); 
  app.enableCors(); //프론트가 브라우저에서 직접 호출 - 지금은 전체 허용
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
