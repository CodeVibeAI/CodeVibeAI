/**
 * Script to package the CodeVibeAI application for distribution
 */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

// Configuration
const packageConfig = {
  rootDir: path.resolve(__dirname, '..'),
  distDir: path.resolve(__dirname, '../dist'),
  outputDir: path.resolve(__dirname, '../packages'),
  appName: 'codevibeai',
  version: require('../package.json').version,
};

// Ensure output directory exists
if (!fs.existsSync(packageConfig.outputDir)) {
  fs.mkdirSync(packageConfig.outputDir, { recursive: true });
}

/**
 * Create a timestamped version string
 * @returns {string} - Version string with timestamp
 */
function getVersionString() {
  const date = new Date();
  const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate()
  ).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
  return `${packageConfig.version}-${timestamp}`;
}

/**
 * Package the browser application
 */
function packageBrowser() {
  console.log('Creating browser application package...');
  
  const versionString = getVersionString();
  const outputFileName = `${packageConfig.appName}-browser-${versionString}.zip`;
  const outputPath = path.join(packageConfig.outputDir, outputFileName);
  
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });
  
  // Handle archive warnings
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn('Warning during archiving:', err);
    } else {
      throw err;
    }
  });
  
  // Handle archive errors
  archive.on('error', function(err) {
    throw err;
  });
  
  // Finalize the archive when the output stream closes
  output.on('close', function() {
    console.log(`Browser package created: ${outputFileName}`);
    console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  });
  
  // Pipe archive data to the output file
  archive.pipe(output);
  
  // Add files to the archive
  archive.directory(path.join(packageConfig.distDir, 'browser'), false);
  archive.directory(path.join(packageConfig.rootDir, 'plugins'), 'plugins');
  
  // Add package.json and other essential files
  archive.file(path.join(packageConfig.rootDir, 'package.json'), { name: 'package.json' });
  archive.file(path.join(packageConfig.rootDir, 'LICENSE-EPL'), { name: 'LICENSE-EPL' });
  
  // Finalize the archive
  archive.finalize();
}

/**
 * Package the Electron application
 */
function packageElectron() {
  console.log('Creating Electron application package...');
  
  // Electron packaging is more complex and requires electron-builder
  // This is a simplified version that just packages the files
  const versionString = getVersionString();
  const outputFileName = `${packageConfig.appName}-electron-${versionString}.zip`;
  const outputPath = path.join(packageConfig.outputDir, outputFileName);
  
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });
  
  // Handle archive warnings and errors
  archive.on('warning', err => err.code === 'ENOENT' ? console.warn(err) : Promise.reject(err));
  archive.on('error', err => Promise.reject(err));
  
  // Log completion
  output.on('close', function() {
    console.log(`Electron package created: ${outputFileName}`);
    console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  });
  
  // Pipe archive data to the output file
  archive.pipe(output);
  
  // Add files to the archive
  archive.directory(path.join(packageConfig.distDir, 'electron'), false);
  archive.directory(path.join(packageConfig.rootDir, 'plugins'), 'plugins');
  
  // Add package.json and other essential files
  archive.file(path.join(packageConfig.rootDir, 'package.json'), { name: 'package.json' });
  archive.file(path.join(packageConfig.rootDir, 'LICENSE-EPL'), { name: 'LICENSE-EPL' });
  
  // Finalize the archive
  archive.finalize();
}

// Execute the packaging
try {
  console.log('Starting packaging process...');
  packageBrowser();
  packageElectron();
} catch (error) {
  console.error('Error during packaging:', error);
  process.exit(1);
}