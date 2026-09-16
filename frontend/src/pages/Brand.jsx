import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useToast } from '../context/ToastContext.jsx';
import BrandLogo, { BrandMark } from '../components/ui/BrandLogo.jsx';
import { SectionHead } from '../components/ui/index.jsx';
import './brand.css';

/* ==========================================================================
   Intro video — drawn frame by frame on a canvas, so the same timeline is the
   live preview and the recorded file (MediaRecorder on canvas.captureStream).
   ========================================================================== */

const FORMATS = {
  landscape: { w: 1920, h: 1080, label: '16:9 — Website / YouTube' },
  portrait: { w: 1080, h: 1920, label: '9:16 — Reels / TikTok / Story' },
  square: { w: 1080, h: 1080, label: '1:1 — Instagram / Facebook post' },
};
const DURATION = 7;
const A_PATH = 'M32 14 46 48h-5.6l-3.1-7.6H26.7L23.6 48H18L32 14Zm0 11.6-3.6 9.2h7.2L32 25.6Z';
const TAGLINE = 'STYLE  •  ELEGANCE  •  YOU';

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const seg = (t, start, end) => clamp((t - start) / (end - start));
const easeOut = (x) => 1 - (1 - x) ** 3;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const rand = (i) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({
  x: rand(i),
  y: rand(i + 100),
  r: 0.8 + rand(i + 200) * 2.6,
  speed: 0.2 + rand(i + 300) * 0.8,
  phase: rand(i + 400) * Math.PI * 2,
}));

const goldGradient = (ctx, x0, y0, x1, y1) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#f6e3b4');
  g.addColorStop(0.5, '#c9a35a');
  g.addColorStop(1, '#8a6424');
  return g;
};

const drawFrame = (ctx, w, h, t) => {
  const u = Math.min(w, h) / 1080;
  const portrait = h > w * 1.2;
  const intro = easeOut(seg(t, 0, 0.9));
  const outro = easeInOut(seg(t, DURATION - 0.8, DURATION));

  // ground
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#05040a';
  ctx.fillRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.8);
  bg.addColorStop(0, '#3a2650');
  bg.addColorStop(0.5, '#1c1326');
  bg.addColorStop(1, '#07050c');
  ctx.globalAlpha = intro;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // drifting aura glows
  const glow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  glow(w * (0.25 + 0.04 * Math.sin(t * 0.7)), h * 0.28, 620 * u, 'rgba(201,163,90,0.20)');
  glow(w * (0.78 + 0.04 * Math.cos(t * 0.6)), h * 0.74, 700 * u, 'rgba(120,60,150,0.28)');

  // gold dust
  for (const p of PARTICLES) {
    const y = (((p.y * h - t * p.speed * 70 * u) % h) + h) % h;
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.4 + p.phase));
    ctx.globalAlpha = intro * twinkle * 0.7;
    ctx.fillStyle = '#e6c27a';
    ctx.beginPath();
    ctx.arc(p.x * w, y, p.r * u, 0, Math.PI * 2);
    ctx.fill();
  }

  // ------------------------------------------------ the mark
  const markSize = (portrait ? 470 : 380) * u;
  const cx = w / 2;
  const cy = h * (portrait ? 0.4 : 0.37);
  const s = markSize / 64;

  ctx.save();
  ctx.translate(cx - 32 * s, cy - 32 * s);
  ctx.scale(s, s);

  const discIn = easeOut(seg(t, 0.9, 1.9));
  const disc = ctx.createRadialGradient(22, 20, 0, 32, 32, 34);
  disc.addColorStop(0, '#3a2650');
  disc.addColorStop(1, '#140e1d');
  ctx.globalAlpha = discIn;
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const ringP = easeInOut(seg(t, 0.3, 1.7));
  const pulse = 0.5 + 0.5 * Math.sin(Math.max(0, t - 4.2) * 3);
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(230,194,122,0.85)';
  ctx.shadowBlur = (18 + (t > 4.2 ? pulse * 22 : 0)) * u;
  ctx.strokeStyle = goldGradient(ctx, 0, 0, 64, 64);
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(32, 32, 25.5, -Math.PI / 2, -Math.PI / 2 + ringP * Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const aIn = easeOut(seg(t, 1.25, 2.25));
  if (aIn > 0) {
    const letter = new Path2D(A_PATH);
    ctx.save();
    ctx.translate(32, 33);
    ctx.scale(0.72 + 0.28 * aIn, 0.72 + 0.28 * aIn);
    ctx.translate(-32, -33);
    ctx.globalAlpha = aIn;
    ctx.fillStyle = goldGradient(ctx, 18, 14, 46, 48);
    ctx.fill(letter, 'evenodd');

    // one light sweep across the letter
    const sweep = seg(t, 2.3, 3.1);
    if (sweep > 0 && sweep < 1) {
      ctx.clip(letter, 'evenodd');
      const x = -10 + sweep * 84;
      const band = ctx.createLinearGradient(x - 8, 0, x + 8, 0);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.5, 'rgba(255,250,235,0.9)');
      band.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, 64, 64);
    }
    ctx.restore();
  }

  const star = easeOut(seg(t, 1.9, 2.4));
  if (star > 0) {
    ctx.save();
    ctx.translate(32, 8);
    ctx.scale(star * 1.4 - (star > 0.8 ? (star - 0.8) * 2 : 0), star * 1.4 - (star > 0.8 ? (star - 0.8) * 2 : 0));
    ctx.globalAlpha = star;
    ctx.fillStyle = '#fff3d6';
    ctx.shadowColor = '#fff3d6';
    ctx.shadowBlur = 20 * u;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(0.8, -0.8);
    ctx.lineTo(3, 0);
    ctx.lineTo(0.8, 0.8);
    ctx.lineTo(0, 3);
    ctx.lineTo(-0.8, 0.8);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-0.8, -0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // ------------------------------------------------ wordmark
  const size = (portrait ? 168 : 150) * u;
  const baseY = cy + markSize / 2 + size * 1.08;
  const roman = `600 ${size}px "Cormorant Garamond", Georgia, serif`;
  const italic = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`;
  const chars = [...'Aura '].map((c) => ({ c, font: roman, gold: false })).concat([...'Craft'].map((c) => ({ c, font: italic, gold: true })));
  let total = 0;
  for (const ch of chars) {
    ctx.font = ch.font;
    ch.w = ctx.measureText(ch.c).width;
    total += ch.w;
  }
  let x = cx - total / 2;
  ctx.textBaseline = 'alphabetic';
  chars.forEach((ch, i) => {
    const p = easeOut(seg(t, 2.45 + i * 0.075, 3.05 + i * 0.075));
    ctx.font = ch.font;
    ctx.globalAlpha = p;
    ctx.fillStyle = ch.gold ? goldGradient(ctx, cx, baseY - size, cx + total / 2, baseY) : '#f6ead0';
    ctx.fillText(ch.c, x, baseY + (1 - p) * 40 * u);
    x += ch.w;
  });

  // hairline + tagline
  const line = easeInOut(seg(t, 3.5, 4.3));
  ctx.globalAlpha = line * 0.8;
  ctx.fillStyle = goldGradient(ctx, cx - 200 * u, 0, cx + 200 * u, 0);
  ctx.fillRect(cx - 180 * u * line, baseY + size * 0.34, 360 * u * line, 2 * u);

  const tag = easeOut(seg(t, 3.8, 4.8));
  const tagSize = (portrait ? 38 : 34) * u;
  ctx.font = `500 ${tagSize}px Outfit, system-ui, sans-serif`;
  const spacing = (12 + 18 * (1 - tag)) * u;
  const letters = [...TAGLINE];
  const widths = letters.map((c) => ctx.measureText(c).width);
  const tagWidth = widths.reduce((a, b) => a + b, 0) + spacing * (letters.length - 1);
  let tx = cx - tagWidth / 2;
  ctx.globalAlpha = tag * 0.9;
  ctx.fillStyle = '#e9d9b6';
  letters.forEach((c, i) => {
    ctx.fillText(c, tx, baseY + size * 0.34 + tagSize * 2.1);
    tx += widths[i] + spacing;
  });

  // fade out
  if (outro > 0) {
    ctx.globalAlpha = outro;
    ctx.fillStyle = '#05040a';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalAlpha = 1;
};

const pickMime = () => {
  const options = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return options.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';
};

const IntroVideo = ({ L }) => {
  const toast = useToast();
  const canvasRef = useRef(null);
  const startRef = useRef(0);
  const [format, setFormat] = useState('landscape');
  const [recording, setRecording] = useState(false);
  const [download, setDownload] = useState(null);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    Promise.all([
      document.fonts?.load('600 100px "Cormorant Garamond"'),
      document.fonts?.load('italic 600 100px "Cormorant Garamond"'),
      document.fonts?.load('500 30px Outfit'),
    ])
      .catch(() => {})
      .finally(() => setFontsReady(true));
  }, []);

  const restart = useCallback(() => {
    startRef.current = performance.now();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fontsReady) return undefined;
    const { w, h } = FORMATS[format];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    restart();
    let frame;
    const tick = (now) => {
      const elapsed = (now - startRef.current) / 1000;
      // Preview loops with a short black pause; a recording plays exactly once.
      const loop = DURATION + 0.8;
      const t = recording ? Math.min(elapsed, DURATION) : elapsed % loop;
      drawFrame(ctx, w, h, Math.min(t, DURATION));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [format, fontsReady, recording, restart]);

  const record = () => {
    const canvas = canvasRef.current;
    const mime = pickMime();
    if (!canvas?.captureStream || !mime) {
      toast.error(L('এই ব্রাউজারে ভিডিও রেকর্ড সাপোর্ট করে না — Chrome বা Edge ব্যবহার করুন।', 'This browser cannot record video — please use Chrome or Edge.'));
      return;
    }
    if (download) URL.revokeObjectURL(download.url);
    setDownload(null);
    const stream = canvas.captureStream(60);
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime.split(';')[0] });
      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
      const { w, h } = FORMATS[format];
      const file = { url: URL.createObjectURL(blob), name: `aura-craft-intro-${w}x${h}.${ext}`, ext, size: blob.size };
      setDownload(file);
      setRecording(false);
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      a.click();
    };
    setRecording(true);
    restart();
    recorder.start(250);
    setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), DURATION * 1000 + 250);
  };

  return (
    <>
      <div className="video-stage">
        <canvas ref={canvasRef} aria-label="Aura Craft intro animation" />
        {recording && <span className="video-stage__rec">REC</span>}
      </div>
      <div className="video-controls">
        <select className="select" style={{ width: 'auto' }} value={format} onChange={(e) => setFormat(e.target.value)} disabled={recording}>
          {Object.entries(FORMATS).map(([key, f]) => (
            <option key={key} value={key}>
              {f.label} ({f.w}×{f.h})
            </option>
          ))}
        </select>
        <button type="button" className="btn btn--sm" onClick={restart} disabled={recording}>
          ↺ {L('আবার চালান', 'Replay')}
        </button>
        <button type="button" className="btn btn--gold btn--sm" onClick={record} disabled={recording || !fontsReady}>
          {recording ? L(`রেকর্ড হচ্ছে… (${DURATION}s)`, `Recording… (${DURATION}s)`) : L('ভিডিও ডাউনলোড করুন', 'Download video')}
        </button>
        {download && (
          <a className="btn btn--sm" href={download.url} download={download.name}>
            {download.name} · {(download.size / 1048576).toFixed(1)} MB
          </a>
        )}
      </div>
      <p className="mute-2" style={{ marginTop: 10 }}>
        {L(
          'ভিডিওটি আপনার ব্রাউজারেই তৈরি হয় (৭ সেকেন্ড, ৬০fps)। Chrome/Edge-এ MP4, অন্য ব্রাউজারে WebM ফাইল পাবেন — WebM হলে Instagram-এ দেওয়ার আগে MP4-এ কনভার্ট করে নিন।',
          'The video is rendered right in your browser (7 seconds, 60fps). Chrome/Edge save MP4; other browsers save WebM — convert WebM to MP4 before posting to Instagram.'
        )}
      </p>
    </>
  );
};

const PALETTE = [
  { name: 'Midnight Plum', hex: '#1C1326', use: ['প্রধান গাঢ় রং — টেক্সট, বাটন, ব্যাকগ্রাউন্ড', 'Primary dark — text, buttons, grounds'] },
  { name: 'Champagne Gold', hex: '#C9A35A', use: ['ব্র্যান্ড অ্যাকসেন্ট — লোগো, হাইলাইট', 'Brand accent — logo, highlights'] },
  { name: 'Antique Bronze', hex: '#8A6424', use: ['গোল্ড গ্রেডিয়েন্টের গভীর অংশ', 'Deep end of the gold gradient'] },
  { name: 'Ivory Silk', hex: '#F6F0E6', use: ['লাইট থিমের ব্যাকগ্রাউন্ড', 'Light theme ground'] },
  { name: 'Rose Quartz', hex: '#ECC4BA', use: ['নরম অরা গ্লো, অফার', 'Soft aura glow, offers'] },
  { name: 'Night Sapphire', hex: '#080B15', use: ['ডার্ক থিমের ব্যাকগ্রাউন্ড', 'Dark theme ground'] },
];

const Brand = () => {
  const { lang } = useI18n();
  const L = (bn, en) => (lang === 'bn' ? bn : en);

  return (
    <div className="container section--tight">
      <section className="brand-hero">
        <span className="eyebrow">Brand Identity</span>
        <div className="brand-hero__mark" style={{ marginTop: 18 }}>
          <BrandMark size={170} />
        </div>
        <h1 className="brand-hero__word">
          {[...'Aura'].map((c, i) => (
            <span key={`a${i}`} style={{ animationDelay: `${0.6 + i * 0.07}s` }}>{c}</span>
          ))}{' '}
          <em>
            {[...'Craft'].map((c, i) => (
              <span key={`c${i}`} style={{ animationDelay: `${0.95 + i * 0.07}s` }}>{c}</span>
            ))}
          </em>
        </h1>
        <p className="brand-hero__tag">Style • Elegance • You</p>
      </section>

      <section className="section--tight">
        <SectionHead
          eyebrow="Intro Video"
          title={L('ব্র্যান্ডিং ইন্ট্রো ভিডিও', 'Branding intro video')}
          text={L(
            'লোগো রিভিল, স্টাইলিশ টেক্সট অ্যানিমেশন ও প্রিমিয়াম ব্যাকগ্রাউন্ড — ওয়েবসাইট ও সোশ্যাল মিডিয়ার জন্য তিনটি ফরম্যাটে।',
            'Logo reveal, stylish text animation and a premium background — in three formats for the website and social media.'
          )}
        />
        <div className="card card--pad">
          <IntroVideo L={L} />
        </div>
      </section>

      <section className="section--tight">
        <SectionHead eyebrow="Logo" title={L('লোগো ভ্যারিয়েশন', 'Logo variations')} />
        <div className="brand-grid">
          <div className="logo-tile logo-tile--dark">
            <span className="brand"><BrandLogo sub="Style • Elegance" size={52} /></span>
          </div>
          <div className="logo-tile logo-tile--light">
            <span className="brand"><BrandLogo sub="Style • Elegance" size={52} /></span>
          </div>
          <div className="logo-tile logo-tile--gold">
            <BrandMark size={96} />
          </div>
        </div>
        <div className="row gap-8 wrap" style={{ marginTop: 14 }}>
          <a className="btn btn--sm" href="/logo.svg?v=2" download="aura-craft-mark.svg">
            {L('লোগো মার্ক (SVG) ডাউনলোড', 'Download logo mark (SVG)')}
          </a>
        </div>
      </section>

      <section className="section--tight">
        <SectionHead eyebrow="Colour" title={L('প্রিমিয়াম কালার প্যালেট', 'Premium colour palette')} />
        <div className="brand-grid">
          {PALETTE.map((c) => (
            <div className="card swatch-card" key={c.hex}>
              <div className="swatch-card__chip" style={{ background: c.hex }} />
              <div className="swatch-card__body">
                <b>{c.name}</b>
                <span className="mute-2 num">{c.hex}</span>
                <span className="mute-2">{L(c.use[0], c.use[1])}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section--tight">
        <SectionHead eyebrow="Typography" title={L('টাইপোগ্রাফি', 'Typography')} />
        <div className="card card--pad type-specimen">
          <div className="type-specimen__row">
            <span className="mute-2">Wordmark · Cormorant Garamond</span>
            <span className="brand__text" style={{ fontSize: 44 }}>
              Aura <em>Craft</em>
            </span>
          </div>
          <div className="type-specimen__row">
            <span className="mute-2">Headings · Cormorant / Noto Serif Bengali</span>
            <span className="display" style={{ fontSize: 30 }}>আপনার স্টাইল, আমাদের অনন্যতা</span>
          </div>
          <div className="type-specimen__row">
            <span className="mute-2">Body · Hind Siliguri</span>
            <span>প্রিমিয়াম জুয়েলারি, পারফিউম ও এক্সক্লুসিভ গিফট আইটেম — Premium jewellery & gifts.</span>
          </div>
          <div className="type-specimen__row">
            <span className="mute-2">UI & numbers · Outfit</span>
            <span style={{ fontFamily: 'var(--font-ui)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Style • Elegance • You — ৳ 1,200</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Brand;
