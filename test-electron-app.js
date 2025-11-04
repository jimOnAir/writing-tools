// Simple test to verify Electron app structure
const { app } = require('electron');
const fs = require('fs');

console.log('Testing Electron app structure...');

// Check if main process file exists and is valid
const mainProcessFile = 'src/main.ts';
if (fs.existsSync(mainProcessFile)) {
  console.log('✓ Main process file exists');
  const content = fs.readFileSync(mainProcessFile, 'utf8');
  if (content.includes('BrowserWindow') && content.includes('app.on')) {
    console.log('✓ Main process file has required Electron components');
  } else {
    console.log('✗ Main process file missing required components');
  }
} else {
  console.log('✗ Main process file missing');
}

// Check if renderer process files exist
const rendererFiles = ['public/index.html', 'src/index.tsx', 'src/App.tsx'];
rendererFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✓ Renderer file exists: ${file}`);
  } else {
    console.log(`✗ Renderer file missing: ${file}`);
  }
});

// Check package.json has proper scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['electron:start', 'electron-dev', 'electron:build'];
requiredScripts.forEach(script => {
  if (packageJson.scripts && packageJson.scripts[script]) {
    console.log(`✓ Script exists: ${script}`);
  } else {
    console.log(`✗ Script missing: ${script}`);
  }
});

console.log('\nElectron app structure test completed.');
