import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { serviceWorkerSource } from './service-worker-source.mjs';
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...await walk(`${dir}/${entry.name}`));
    else if (entry.name !== 'sw.js') files.push(`${dir}/${entry.name}`);
  }
  return files;
}
const files = await walk('dist');
const urls = files.map(file => './' + file.slice(5));
const hash = createHash('sha256');
hash.update(serviceWorkerSource('build', urls));
for (const file of files.sort()) hash.update(await readFile(file));
const version = hash.digest('hex').slice(0, 12);
await writeFile('dist/sw.js', serviceWorkerSource(version, urls));
console.log(`Offline cache ${version}: ${files.length} static files. User photos are never cached.`);
