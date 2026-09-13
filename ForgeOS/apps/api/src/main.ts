import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common'; import { NestFactory } from '@nestjs/core'; import { AppModule } from './app.module';
async function bootstrap() { const app = await NestFactory.create(AppModule); app.setGlobalPrefix('v1'); app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? true }); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); await app.listen(process.env.PORT ?? 4000); }
bootstrap();
