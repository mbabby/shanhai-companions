import { cp, mkdir, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const out = new URL('dist/', root);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of ['index.html', 'src']) {
  await cp(new URL(entry, root), new URL(entry, out), { recursive: true });
}
console.log('Built static game in dist/');
