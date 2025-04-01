import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as basicAuth from 'express-basic-auth';
import helmet from 'helmet';

import './common/utils/instrument';
import { AppModule } from './app.module';

const port = process.env.PORT || 8080;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    ['/api/queues'],
    basicAuth({
      challenge: true,
      users: {
        [process.env.ADMIN_USER_NAME || 'admin']:
          process.env.ADMIN_USER_PASS || '123456',
      },
    }),
  );
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
  await app.listen(port);
}
void bootstrap();
