/**
 * Write a one-page dummy PDF for every /scene/*.pdf path in live JSON.
 * Real collateral should replace these in public/scene/shared/.
 *
 * Every file gets a coloured cover so desk/board thumbs look like paper,
 * not a blank page with a filename. Two body lines is enough.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const scenes = JSON.parse(readFileSync(join(root, 'content/scenes.json'), 'utf8'));

const paths = new Set();
const labels = new Map();

function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const v of value) walk(v);
    return;
  }
  const src = value.src;
  const href = value.href;
  const label = typeof value.label === 'string' ? value.label : '';
  if (typeof src === 'string' && src.startsWith('/scene/') && src.endsWith('.pdf')) {
    paths.add(src);
    if (label) labels.set(src, label);
  }
  if (typeof href === 'string' && href.startsWith('/scene/') && href.endsWith('.pdf')) {
    paths.add(href);
    if (label) labels.set(href, label);
  }
  for (const v of Object.values(value)) {
    if (typeof v === 'string' && v.startsWith('/scene/') && v.endsWith('.pdf')) {
      paths.add(v);
    } else if (v && typeof v === 'object') {
      walk(v);
    }
  }
}

walk(scenes);

for (const extra of [
  '/scene/shared/docs/21-critical-questions.pdf',
  '/scene/shared/docs/aspire-digital-shield.pdf',
  '/scene/shared/docs/competitor-comparison.pdf',
  '/scene/shared/test.pdf',
]) {
  paths.add(extra);
}

function pdfEscape(s) {
  return String(s)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLine(text, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > width) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function assemblePdf(objs) {
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objs.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefAt = Buffer.byteLength(body);
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

/** One-page dummy cover so thumbs read as paper. */
function brochurePdf({ rgb, kicker, title, sections }) {
  const [r, g, b] = rgb;
  const ops = [
    '0.97 0.96 0.94 rg',
    '0 0 612 792 re f',
    `${r} ${g} ${b} rg`,
    '0 0 32 792 re f',
    '0 684 612 108 re f',
    '0.85 0.72 0.32 rg',
    '32 682 580 3 re f',
    '1 1 1 rg',
    `BT /F2 9 Tf 48 762 Td (${pdfEscape(kicker.toUpperCase())}) Tj ET`,
  ];
  const titleLines = wrapLine(title, 34);
  let titleY = 740;
  for (const line of titleLines.slice(0, 3)) {
    ops.push(`BT /F2 18 Tf 48 ${titleY} Td (${pdfEscape(line)}) Tj ET`);
    titleY -= 22;
  }

  let y = 640;
  for (const sec of sections) {
    if (sec.head) {
      ops.push(`${r} ${g} ${b} rg`);
      ops.push(`BT /F2 11 Tf 48 ${y} Td (${pdfEscape(sec.head)}) Tj ET`);
      y -= 18;
    }
    ops.push('0.22 0.22 0.25 rg');
    for (const line of wrapLine(sec.body, 78)) {
      if (y < 56) break;
      ops.push(`BT /F1 12 Tf 48 ${y} Td (${pdfEscape(line)}) Tj ET`);
      y -= 16;
    }
    y -= 16;
  }

  ops.push('0.55 0.55 0.58 rg');
  ops.push('BT /F1 8 Tf 48 36 Td (Aspire Tech  -  Placeholder cover  -  Page 1 of 1) Tj ET');

  const stream = ops.join('\n');
  return assemblePdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ]);
}

const PALETTE = [
  [0.1, 0.16, 0.28],
  [0.05, 0.34, 0.42],
  [0.42, 0.22, 0.08],
  [0.48, 0.14, 0.12],
  [0.16, 0.32, 0.22],
  [0.28, 0.18, 0.36],
  [0.18, 0.22, 0.3],
  [0.45, 0.28, 0.12],
  [0.12, 0.28, 0.4],
  [0.32, 0.12, 0.22],
];

function hashHue(s) {
  let n = 0;
  for (const c of s) n = (n * 33 + c.charCodeAt(0)) >>> 0;
  return PALETTE[n % PALETTE.length];
}

function titleCase(slug) {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function kickerFor(slug) {
  if (slug.startsWith('pillar-')) return 'Campaign pillar';
  if (slug.startsWith('phase-')) return 'Campaign phase';
  if (slug.startsWith('activities-')) return 'Activities';
  if (slug.startsWith('audience-')) return 'Audience';
  if (slug.startsWith('metrics-')) return 'Metrics';
  if (slug.includes('awareness')) return 'Awareness Month';
  if (slug.startsWith('campaign-')) return 'Campaign pack';
  return 'Aspire';
}

const DESK_BROCHURES = {
  '/scene/shared/docs/handbook.pdf': {
    rgb: [0.1, 0.16, 0.28],
    kicker: 'Aspire Security Awareness',
    title: 'Cyber Security Awareness Handbook',
    sections: [
      {
        head: '',
        body: 'Most incidents start with one person clicking one thing. This is the shared floor for every role in the firm.',
      },
    ],
  },
  '/scene/shared/docs/a-soc-brochure.pdf': {
    rgb: [0.05, 0.34, 0.42],
    kicker: 'Aspire Security Operations',
    title: 'A-SOC as-a-Service',
    sections: [
      {
        head: '',
        body: 'Analysts, tooling, and playbooks as a service. Alerts triaged against your environment, not a dashboard nobody watches.',
      },
    ],
  },
  '/scene/shared/docs/it-buyers-guide.pdf': {
    rgb: [0.42, 0.22, 0.08],
    kicker: 'For business owners',
    title: 'I.T. Support Services and Fees',
    sections: [
      {
        head: '',
        body: 'Per-user and all-you-can-eat look similar on a slide. These are the questions to ask before you sign.',
      },
    ],
  },
  '/scene/shared/docs/21-critical-questions.pdf': {
    rgb: [0.48, 0.14, 0.12],
    kicker: 'Vendor diligence',
    title: '21 Critical IT Security Questions',
    sections: [
      {
        head: '',
        body: 'Who owns incident response. How often you restore from backup. What MFA actually covers. Ask any vendor, including us.',
      },
    ],
  },
};

function specFor(pubPath) {
  if (DESK_BROCHURES[pubPath]) return DESK_BROCHURES[pubPath];
  const slug = pubPath.split('/').pop().replace(/\.pdf$/i, '');
  const title = labels.get(pubPath) || titleCase(slug);
  return {
    rgb: hashHue(slug),
    kicker: kickerFor(slug),
    title,
    sections: [
      {
        head: '',
        body: 'A one-page stand-in so the thumbnail reads as a real cover. Replace this file with the live PDF when it is ready.',
      },
    ],
  };
}

let wrote = 0;
for (const pubPath of [...paths].sort()) {
  const abs = join(root, 'public', ...pubPath.replace(/^\//, '').split('/'));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, brochurePdf(specFor(pubPath)));
  wrote += 1;
}

console.log(`[scene] wrote ${wrote} PDF cover(s) under public/scene/shared`);

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) {
    const kb = n / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = n / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function publicAbs(href) {
  return join(root, 'public', ...href.replace(/^\//, '').split('/'));
}

function patchDownloadSizes(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const v of value) patchDownloadSizes(v);
    return;
  }
  const download = value.download;
  if (download && typeof download.href === 'string' && download.href.startsWith('/')) {
    const abs = publicAbs(download.href);
    if (existsSync(abs)) download.sizeLabel = formatBytes(readFileSync(abs).length);
    else delete download.sizeLabel;
  }
  for (const v of Object.values(value)) patchDownloadSizes(v);
}

patchDownloadSizes(scenes);
writeFileSync(join(root, 'content/scenes.json'), `${JSON.stringify(scenes, null, 2)}\n`);
console.log('[scene] sizeLabel now matches files on disk');
