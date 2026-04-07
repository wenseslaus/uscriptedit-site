const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const projectsDir = path.join(__dirname, '../public/projects');

const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

async function convertToWebP(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (!supportedFormats.includes(ext)) return false;
  
  try {
    await sharp(inputPath)
      .resize(1920, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);
    return true;
  } catch (err) {
    console.error(`Error converting ${inputPath}: ${err.message}`);
    return false;
  }
}

async function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const baseName = path.basename(entry.name, ext);
      
      if (supportedFormats.includes(ext) && !entry.name.endsWith('.webp')) {
        const webpPath = path.join(dir, `${baseName}.webp`);
        
        console.log(`Converting: ${entry.name} -> ${baseName}.webp`);
        
        const converted = await convertToWebP(fullPath, webpPath);
        
        if (converted) {
          fs.unlinkSync(fullPath);
          console.log(`  Replaced: ${entry.name}`);
        }
      }
    }
  }
}

async function main() {
  console.log('Converting images to WebP...\n');
  await processDirectory(projectsDir);
  console.log('\nDone!');
}

main();