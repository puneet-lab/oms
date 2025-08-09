import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

function loadOpenApi() {
  const file = path.join(process.cwd(), 'api-docs', 'openapi.yaml');
  const text = fs.readFileSync(file, 'utf8');
  return YAML.parse(text);
}

export function mountSwagger(app: Express) {
  const spec = loadOpenApi();
  app.get('/api/openapi.json', (_req, res) => res.json(spec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
