import {
  BadRequestException,
  INestApplication,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import basicAuth from 'express-basic-auth';
import { NestContainer, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DebuggedTree, SpelunkerModule } from 'nestjs-spelunker';
import { writeFileSync } from 'fs';
import helmet from 'helmet';

import './common/utils/instrument';
import { AppModule } from './app.module';
import { CoursesModule } from './courses/courses.module';

const port = process.env.PORT || 8080;

const getGlobalModules = (app: INestApplication) => {
  const modules = ((app as any).container as NestContainer).getModules();
  const modulesArray = Array.from(modules.values());
  const globalModules = modulesArray
    .filter((module) => module.isGlobal)
    .map((module) => module.metatype.name);
  return globalModules;
};

const genrateAppGraph = (app: INestApplication) => {
  const globalModules = getGlobalModules(app);
  const tree = SpelunkerModule.explore(app, {
    ignoreImports: [(moduleName) => globalModules.includes(moduleName)],
  });
  const root = SpelunkerModule.graph(tree);
  const edges = SpelunkerModule.findGraphEdges(root);
  let graph = 'graph LR\n';
  const mermaidEdges = edges.forEach(({ from, to }) => {
    graph += `  ${from.module.name}-->${to.module.name}\n`;
  });
  return graph;
};

const genrateModuleProviderGraph = async (rootModule: Type<any>) => {
  const dependencies = await SpelunkerModule.debug(rootModule);
  let providerGraph = 'graph LR\n';

  dependencies.forEach((module) => {
    const moduleItems = [...module.providers, ...module.controllers];
    moduleItems.forEach((moduleItem) => {
      return moduleItem.dependencies.forEach((dependency) => {
        providerGraph += `  ${moduleItem.name}-->${dependency}\n`;
      });
    });
  });

  const genrateSubgraph = (module: DebuggedTree) => {
    let subgraph = `  subgraph ${module.name}\n`;
    const innerItems = Array.from(
      new Set(
        [...module.providers, ...module.controllers, ...module.exports].map(
          (item) => item.name,
        ),
      ),
    );

    innerItems.forEach((itemName) => {
      subgraph += `  ${itemName}\n`;
    });

    subgraph += '  end\n';
    return subgraph;
  };

  dependencies.forEach((module) => {
    providerGraph += genrateSubgraph(module);
  });
  return providerGraph;
};

const genrateModuleGraph = async (module: Type<any>) => {
  const dependencies = await SpelunkerModule.debug(module);
  let moduleGraph = 'graph LR\n';

  dependencies.forEach((module) => {
    module.imports.forEach((importedModule) => {
      moduleGraph += `  ${module.name}-->${importedModule}\n`;
    });
  });

  return moduleGraph;
};

async function bootstrap() {
  // const coursesModule = await genrateModuleGraph(CoursesModule);
  // writeFileSync('courses.modules.mmd', coursesModule);
  // const coursesProvider = await genrateModuleProviderGraph(CoursesModule);
  // writeFileSync('courses.providers.mmd', coursesModule);
  const app = await NestFactory.create(AppModule);
  // const graph = genrateAppGraph(app);
  // writeFileSync('app.modules.mmd', graph);
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
