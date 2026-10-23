import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // ponytail: el logo y la foto viajan en base64 dentro del JSON (por eso 1 MB); al desplegar, pasarlos a un bucket (S3/Vercel Blob).
  app.useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL?.split(',') ?? ['http://localhost:3000'], methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT) || 3001);
}
bootstrap();
