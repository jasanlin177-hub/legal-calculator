#!/usr/bin/env node
// Post-build script: inline all JS/CSS assets into index.html to produce a single-file app
// Usage: node scripts/inline-html.cjs [srcDir] [outFile]
const fs = require('fs');
const path = require('path');

const srcDir  = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));
const outFile = path.resolve(process.argv[3] || path.join(srcDir, 'index.html'));

let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');

// Inline CSS <link> tags
html = html.replace(/<link([^>]*?) href="([^"]+\.css)"([^>]*?)>/g, (match, before, href, after) => {
  const filePath = path.join(srcDir, href);
  if (!fs.existsSync(filePath)) return match;
  const css = fs.readFileSync(filePath, 'utf8');
  return `<style>${css}</style>`;
});

// Inline JS <script src="..."> tags
html = html.replace(/<script([^>]*?) src="([^"]+\.js)"([^>]*?)><\/script>/g, (match, before, src, after) => {
  const filePath = path.join(srcDir, src);
  if (!fs.existsSync(filePath)) return match;
  const js = fs.readFileSync(filePath, 'utf8');
  const safeJs = js.replace(/<\/script>/gi, '\\x3C/script>');
  return `<script${before}${after}>${safeJs}</script>`;
});

fs.writeFileSync(outFile, html, 'utf8');
console.log(`✓ Inlined ${(html.length / 1024).toFixed(1)} KB → ${outFile}`);
