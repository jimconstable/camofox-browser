import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflow = fs.readFileSync(
  path.join(repoRoot, '.github/workflows/publish-image.yml'),
  'utf8'
);

describe('published image Dockerfile packaging', () => {
  it('packages and validates the MCP cookie module in the Dockerfile the publish workflow actually builds', () => {
    const match = workflow.match(/^\s*file:\s*(\S+)\s*$/m);
    expect(match).not.toBeNull();

    const dockerfile = fs.readFileSync(path.join(repoRoot, match[1]), 'utf8');
    expect(dockerfile).toMatch(/^COPY mcp\/ \.\/mcp\/$/m);
    expect(dockerfile).toMatch(/^RUN node -e "import\('\.\/lib\/cookies\.js'\)"$/m);
  });
});
