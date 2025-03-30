import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import './common/utils/instrument';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const errorMessages = errors
          .map((err) => Object.values(err.constraints as any).join(', '))
          .join('; ');
        return new BadRequestException(errorMessages);
      },
    }),
  );
  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('GKV App')
    .setDescription('GKV Attendence app')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);
  await app.listen(process.env.PORT ?? 8080);
}
void bootstrap();
