import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Compose places one ForgeOS web proxy in front of this private service.
  // Standalone deployments default to no trusted proxy hops.
  const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0 || trustedProxyHops > 2) {
    throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 2');
  }
  app.set('trust proxy', trustedProxyHops);

  // Security middleware (disable CSP in dev so static pages load properly)
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  // Global validation pipe — allow unknown fields so partial payloads work
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // allow extra fields from clients
      transform: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Serve static files — use process.cwd() so it works in both ts-node and compiled modes
  const publicPath = join(process.cwd(), 'public');
  app.useStaticAssets(publicPath);
  console.log(`📁 Serving static files from: ${publicPath}`);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 MathShield API running on port ${port}`);
  console.log(`📱 Demo:       http://localhost:${port}/demo.html`);
  console.log(`📊 Dashboard:  http://localhost:${port}/dashboard.html`);
  console.log(`🔌 API Base:   http://localhost:${port}/api\n`);
}
bootstrap();
