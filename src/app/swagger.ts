import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';
import express from 'express'; // ⬅️ add this
import type { Express } from 'express';

function loadYaml(relPath: string) {
  const abs = path.join(process.cwd(), relPath);
  const text = fs.readFileSync(abs, 'utf8');
  return YAML.parse(text);
}

export function mountSwagger(app: Express) {
  // 1) serve the split docs statically so $refs can be fetched by the browser
  app.use('/api-docs', express.static(path.join(process.cwd(), 'api-docs')));

  // 2) Swagger UI should load by URL (not by in-memory object), so $refs work
  const v1Url = '/api-docs/v1/openapi.yaml';
  app.use(
    '/docs/v1',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: { url: v1Url },
    }),
  );
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: { url: v1Url }, // alias to latest
    }),
  );

  // 3) (optional) still expose JSON if you like (will contain $refs)
  app.get('/api/openapi.v1.json', (_req, res) => res.json(loadYaml('api-docs/v1/openapi.yaml')));
}
