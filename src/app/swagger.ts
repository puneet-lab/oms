import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

function loadYaml(relPath: string) {
  const abs = path.join(process.cwd(), relPath);
  const text = fs.readFileSync(abs, 'utf8');
  return YAML.parse(text);
}

export function mountSwagger(app: Express) {
  const v1 = loadYaml('api-docs/v1/openapi.yaml');

  // JSON specs
  app.get('/api/openapi.v1.json', (_req, res) => res.json(v1));

  // UIs
  app.use('/docs/v1', swaggerUi.serve, swaggerUi.setup(v1));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(v1)); // alias to latest
}
