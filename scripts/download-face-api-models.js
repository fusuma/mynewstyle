#!/usr/bin/env node
/**
 * Downloads required @vladmandic/face-api model weights into public/models/face-api/.
 *
 * Required models (total ~6-7 MB):
 *   - ssd_mobilenetv1:     face detection (locates bounding boxes)
 *   - face_landmark_68:    face landmarks (required by faceRecognitionNet pipeline)
 *   - face_recognition:    128-d face descriptor extraction
 *
 * Usage:
 *   node scripts/download-face-api-models.js
 *
 * Or add to package.json scripts:
 *   "postinstall": "node scripts/download-face-api-models.js"
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL =
  'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'models', 'face-api');

/**
 * Model files to download. Manifests reference the shard files so we need both.
 * Source: https://github.com/vladmandic/face-api/tree/master/model
 */
const MODEL_FILES = [
  // SSD MobileNet v1 — face detection
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',

  // Face Landmark 68 Net — face landmark detection (required by recognition pipeline)
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',

  // Face Recognition Net — 128-d face descriptor extraction
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`  [skip] ${path.basename(dest)} (already exists)`);
      return resolve();
    }

    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlinkSync(dest);
          return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`  [ok]   ${path.basename(dest)}`);
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Downloading face-api model weights to: ${OUTPUT_DIR}\n`);

  for (const filename of MODEL_FILES) {
    const url = `${BASE_URL}/${filename}`;
    const dest = path.join(OUTPUT_DIR, filename);
    try {
      await downloadFile(url, dest);
    } catch (err) {
      console.error(`  [FAIL] ${filename}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  if (process.exitCode === 1) {
    console.error('\nSome model files failed to download. Run the script again to retry.');
  } else {
    console.log('\nAll model files downloaded successfully.');
  }
}

main();
