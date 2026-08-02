import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dockerfile = fs.readFileSync(path.join(repoRoot, 'Dockerfile'), 'utf8');

describe('production Docker image packaging', () => {
  it('packages and validates the MCP cookie module used by core persistence', () => {
    expect(dockerfile).toMatch(/^COPY mcp\/ \.\/mcp\/$/m);
    expect(dockerfile).toMatch(/^RUN node -e "import\('\.\/lib\/cookies\.js'\)"$/m);
  });
});
