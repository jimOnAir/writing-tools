const fs = require('fs');
const path = require('path');

// Check if required files exist
const requiredFiles = [
  'public/index.html',
  'src/main.ts',
  'src/index.tsx',
  'src/App.tsx',
  'package.json',
  'tsconfig.main.json',
  'electron-builder.json'
];

console.log('Verifying Electron app setup...\n');

let allFilesExist = true;

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${file}: ${exists ? '✓ Found' : '✗ Missing'}`);
  if (!exists) allFilesExist = false;
});

// Check package.json has Electron dependencies
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const electronDeps = ['electron', 'electron-builder'];
let allDepsExist = true;

electronDeps.forEach(dep => {
  const exists = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
  console.log(`${dep}: ${exists ? '✓ Found' : '✗ Missing'}`);
  if (!exists) allDepsExist = false;
});

console.log('\n' + (allFilesExist && allDepsExist ? '✓ All setup verified!' : '✗ Some setup issues found'));

// Check if main process file has proper Electron structure
if (fs.existsSync('src/main.ts')) {
  const mainContent = fs.readFileSync('src/main.ts', 'utf8');
  const hasElectronImports = mainContent.includes('electron');
  const hasWindowCreation = mainContent.includes('BrowserWindow');
  console.log(`main.ts has Electron imports: ${hasElectronImports ? '✓ Yes' : '✗ No'}`);
  console.log(`main.ts has window creation: ${hasWindowCreation ? '✓ Yes' : '✗ No'}`);
}

process.exit(allFilesExist && allDepsExist ? 0 : 1);
