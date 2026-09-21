import fs from 'fs';
import path from 'path';

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Ensure docs directory exists
fs.mkdirSync('docs', { recursive: true });

// 2. Copy compiled static files to docs/ (for GitHub Pages: Deploy from branch -> main -> /docs)
copyRecursive('dist/assets', 'docs/assets');
if (fs.existsSync('dist/index.html')) {
  fs.copyFileSync('dist/index.html', 'docs/index.html');
}
if (fs.existsSync('dist/favicon.svg')) {
  fs.copyFileSync('dist/favicon.svg', 'docs/favicon.svg');
}

// 3. Copy compiled assets to root assets/ (for GitHub Pages: Deploy from branch -> main -> / root)
copyRecursive('dist/assets', 'assets');

// 4. Create .nojekyll in both root and docs/ to prevent GitHub Pages Jekyll processing
fs.writeFileSync('.nojekyll', '');
fs.writeFileSync('docs/.nojekyll', '');

console.log('GitHub Pages static distribution synchronized successfully into /docs and /assets');
