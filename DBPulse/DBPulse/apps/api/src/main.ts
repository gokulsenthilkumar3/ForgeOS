import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  app.enableCors({
    origin: process.env.NEXT_PUBLIC_API_URL ?? '*',
    credentials: true,
  });

  await app.listen(process.env.API_PORT ?? 3001);
  console.log(`DBPulse API running on port ${process.env.API_PORT ?? 3001}`);
}
bootstrap();
