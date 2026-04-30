'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'frontend');
const outputDir = path.join(root, 'dist');

const defaultApiUrl = 'https://interview-practice-partner-backend.onrender.com';
const apiBaseUrl = (process.env.API_BASE_URL || defaultApiUrl).replace(/\/+$/, '');

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

fs.rmSync(outputDir, { recursive: true, force: true });
copyDirectory(sourceDir, outputDir);

const runtimeConfig = `window.__APP_CONFIG__ = ${JSON.stringify({ API_BASE_URL: apiBaseUrl }, null, 2)};\n`;
fs.writeFileSync(path.join(outputDir, 'env.js'), runtimeConfig, 'utf8');

console.log(`Frontend built to dist with API_BASE_URL=${apiBaseUrl}`);
