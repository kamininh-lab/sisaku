// reel.html を 1080x1920 / 30fps の MP4 に書き出す
// 使い方: node render.js [出力先.mp4]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const FPS = 30;
  const out = path.resolve(process.argv[2] || path.join(__dirname, 'gyokuryu_shingaku_reel.mp4'));
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'reel-'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'reel.html') + '?still=1', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // すべてのシーンを一度表示してフォントのサブセットを読み込ませる
  await page.evaluate(() => document.querySelectorAll('.scene').forEach(s => (s.style.display = 'block')));
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.fonts.ready);

  const dur = await page.evaluate(() => window.DUR);
  const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(5, '0')}.png`) });
    if (i % 60 === 0) process.stdout.write(`frame ${i}/${n}\n`);
  }
  await browser.close();

  execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
    '-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.png'),
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('done:', out);
})();
