# Scripts

This directory contains utility scripts for the ActivityPass project.

## JavaScript Scripts

### Favicon Generation (`frontend/scripts/js/generate-favicons.js`)

Generates favicon files from the source SVG logo for optimal browser and application compatibility.

**Location**: `frontend/scripts/js/generate-favicons.js`
**Source**: `frontend/src/assets/logo.svg`
**Output**: `frontend/public/` (logo192.png, logo512.png, favicon.ico)

**Usage**:
```bash
cd frontend
node scripts/js/generate-favicons.js
```

**What it does**:
1. Reads the original SVG logo from `src/assets/logo.svg`
2. Generates PNG files in PWA required sizes: 192x192, 512x512 (named logo192.png, logo512.png)
3. Creates `favicon.ico` (32x32 PNG) for legacy browser support
4. Outputs all files to `public/` directory

**Requirements**:
- Node.js with ES modules support
- Sharp library (`npm install --save-dev sharp`)

**Notes**:
- The original SVG should be white (#ffffff) for favicon use
- For app logos, use the `Logo.tsx` component which uses `currentColor` for theming
- Run this script whenever you update the logo design

## Python Scripts

Located in `scripts/py/` - see individual files for documentation.

## Shell Scripts

Located in `scripts/sh/` - see individual files for documentation.