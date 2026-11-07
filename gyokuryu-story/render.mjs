// Renders index.html frame-by-frame with Playwright and pipes PNGs into ffmpeg.
//   node render.mjs                     -> out/gyokuryu_setsumeikai_story_20261108.mp4
//   node render.mjs --stills 1,4.5,9    -> PNG stills (for review) into ./out/stills
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// playwright is resolved via require() so a globally installed copy (NODE_PATH) also works
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const outDir = path.join(dir, 'out');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => { console.error('page error:', e); process.exitCode = 1; });
await page.goto(pathToFileURL(path.join(dir, 'index.html')).href + '?render');
await page.evaluate(() => window.__ready);
const duration = await page.evaluate(() => window.DURATION);

async function frameAt(t) {
  await page.evaluate((s) => window.seek(s), t);
  return page.screenshot({ type: 'png' });
}

if (stillsArg) {
  const sd = path.join(outDir, 'stills'); mkdirSync(sd, { recursive: true });
  for (const t of stillsArg.split(',').map(Number)) {
    writeFileSync(path.join(sd, `t${t.toFixed(2).padStart(5, '0')}.png`), await frameAt(t));
  }
  console.log('stills ->', sd);
} else {
  const out = path.join(outDir, 'gyokuryu_setsumeikai_story_20261108.mp4');
  const frames = Math.round(duration * FPS);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-f', 'lavfi', '-t', String(duration), '-i', 'anullsrc=r=48000:cl=stereo',
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.2', '-r', String(FPS), '-g', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  for (let i = 0; i < frames; i++) {
    const buf = await frameAt(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await done;
  console.log('video ->', out);
}
await browser.close();
