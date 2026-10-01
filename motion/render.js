// Renders the intro frame-by-frame in headless Chrome and pipes PNGs into ffmpeg.
//   node render.js                 → full video (out/ayush-intro.mp4, muxed with out/soundtrack.wav if present)
//   node render.js --stills 1,4.8  → PNG stills to out/stills/
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const TOOLS = process.env.INTRO_TOOLS || __dirname; // folder containing node_modules with puppeteer-core + ffmpeg-static
const puppeteer = require(path.join(TOOLS, 'node_modules', 'puppeteer-core'));
const ffmpeg = require(path.join(TOOLS, 'node_modules', 'ffmpeg-static'));
const TL = require('./timeline.js');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const args = process.argv.slice(2);
  const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--force-color-profile=srgb', '--disable-gpu-vsync'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/') + '?render=1', { waitUntil: 'networkidle0' });
  const fontsOk = await page.evaluate(() => window.ready());
  if (!fontsOk.every(Boolean)) throw new Error('fonts failed to load: ' + JSON.stringify(fontsOk));

  const grab = t => page.evaluate(t => { window.drawFrame(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, t);

  if (stillsArg) {
    const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const s of stillsArg.split(',')) {
      const t = parseFloat(s);
      fs.writeFileSync(path.join(dir, `t${t.toFixed(2)}.png`), Buffer.from(await grab(t), 'base64'));
    }
    console.log('stills written to', dir);
    await browser.close(); return;
  }

  const frames = TL.fps * TL.duration;
  const silent = path.join(OUT, 'video-only.mp4');
  const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'pipe'] });
  let ffErr = ''; ff.stderr.on('data', d => { ffErr += d; });
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const buf = Buffer.from(await grab(f / TL.fps), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error(ffErr.slice(-2000)))));
  await browser.close();

  const wav = path.join(OUT, 'soundtrack.wav');
  if (fs.existsSync(wav)) {
    const final = path.join(OUT, 'ayush-intro.mp4');
    await new Promise((res, rej) => {
      const p = spawn(ffmpeg, ['-y', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', final]);
      let e = ''; p.stderr.on('data', d => { e += d; });
      p.on('close', c => c === 0 ? res() : rej(new Error(e.slice(-2000))));
    });
    console.log('done →', final);
  } else console.log('done (no soundtrack found) →', silent);
})().catch(e => { console.error(e); process.exit(1); });
