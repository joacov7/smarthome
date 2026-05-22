import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const isProd = config.get('NODE_ENV') === 'production';

  // ── Seguridad ──────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin:      isProd ? config.get('ALLOWED_ORIGINS', '').split(',') : '*',
    credentials: true,
  });

  // ── Prefijo global de API ──────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validación de DTOs ────────────────────────────────────
  app.useGlobalPipes(new ValidationPipe({
    whitelist:        true,   // elimina props no declaradas en el DTO
    forbidNonWhitelisted: true,
    transform:        true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // ── Serialización (excluye @Exclude() de entidades) ───────
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector))
  );

  // ── Swagger (solo en desarrollo) ──────────────────────────
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GuayCore API')
      .setDescription('Plataforma IoT modular — GuayCore')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addTag('auth',          'Autenticación y tokens')
      .addTag('organizations', 'Gestión de organizaciones')
      .addTag('devices',       'Registro y control de dispositivos')
      .addTag('telemetry',     'Consulta de telemetría')
      .addTag('rules',         'Motor de reglas')
      .addTag('ota',           'Actualizaciones de firmware')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
    console.log(`📚 Swagger: http://localhost:${config.get('PORT', 3000)}/docs`);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`🚀 GuayCore backend corriendo en http://localhost:${port}/api/v1`);
}

bootstrap();
