import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFavicons() {
  // Source: Original SVG logo in assets directory
  const svgPath = path.join(__dirname, '..', '..', 'src', 'assets', 'logo.svg');
  // Output: Public directory for web assets
  const outputDir = path.join(__dirname, '..', '..', 'public');

  // Standard favicon sizes - only PWA required sizes
  const sizes = [192, 512];

  console.log('Generating favicon files from source SVG');
  console.log(`Source: ${svgPath}`);
  console.log(`Output: ${outputDir}`);

  try {
    // Verify source file exists
    if (!fs.existsSync(svgPath)) {
      throw new Error(`Source SVG not found: ${svgPath}`);
    }

    // Read the SVG content
    const svgBuffer = fs.readFileSync(svgPath);
    console.log('Source SVG loaded successfully');

    // Generate PNG files for each size
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `logo${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated ${outputPath}`);
    }

    // Generate favicon.ico (copy 32x32 PNG for legacy browser support)
    const icoPath = path.join(outputDir, 'favicon.ico');
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(icoPath);
    console.log(`Generated ${icoPath} (32x32 PNG for legacy browsers)`);

    console.log('\nFavicon generation complete!');
    console.log('\nGenerated files:');
    sizes.forEach(size => console.log(`   - logo${size}.png`));
    console.log('   - favicon.ico (32x32 PNG)');
  } catch (error) {
    console.error('Error generating favicons:', error.message);
    process.exit(1);
  }
}

generateFavicons();