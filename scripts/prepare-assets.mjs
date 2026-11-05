import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

await mkdir('public/vendor/wasm', { recursive: true });
await mkdir('public/models', { recursive: true });
await copyFile('node_modules/@mediapipe/tasks-vision/vision_bundle.js', 'public/vendor/vision_bundle.js');
for (const [from, to] of [
  ['node_modules/typescript/LICENSE', 'LICENSE-APACHE-2.0.txt'],
  ['node_modules/@fontsource/geist/LICENSE', 'LICENSE-GEIST.txt'],
  ['node_modules/lucide-react/LICENSE', 'LICENSE-LUCIDE.txt'],
  ['node_modules/react/LICENSE', 'LICENSE-REACT.txt'],
]) await copyFile(from, `public/vendor/${to}`);
for (const file of await readdir('node_modules/@mediapipe/tasks-vision/wasm')) {
  if (file.endsWith('.wasm') || file.endsWith('.js')) {
    await copyFile(`node_modules/@mediapipe/tasks-vision/wasm/${file}`, `public/vendor/wasm/${file}`);
  }
}
const path = 'public/models/face_landmarker.task';
const expectedHash = '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';
let model;
try { model = await readFile(path); } catch {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task');
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  model = Buffer.from(await response.arrayBuffer());
  await writeFile(path, model);
}
const digest = createHash('sha256').update(model).digest('hex');
if (digest !== expectedHash) throw new Error('Face model checksum mismatch. Refusing an unverified model.');
console.log(`Local face model ready (${model.length} bytes, sha256 ${digest})`);
await import('./prepare-appearance.mjs');
