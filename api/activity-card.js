import { kv } from '@vercel/kv';
import { GOOGLE_SANS_MEDIUM_B64, GOOGLE_SANS_BOLD_B64 } from './google-sans-font.js';

const FONT_STYLE = `<style>
    @font-face {
      font-family: 'Google Sans';
      src: url(data:font/woff2;base64,${GOOGLE_SANS_MEDIUM_B64}) format('woff2');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Google Sans';
      src: url(data:font/woff2;base64,${GOOGLE_SANS_BOLD_B64}) format('woff2');
      font-weight: 700;
    }
  </style>`;

function escapeXml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function resolveImageUrl(raw, appId) {
    if (!raw) return '';
    if (raw.startsWith('mp:')) return `https://media.discordapp.net/${raw.slice(3)}`;
    if (raw.startsWith('spotify:')) return `https://i.scdn.co/image/${raw.slice(8)}`;
    if (/^https?:\/\//.test(raw)) return raw;
    if (/^\d+$/.test(raw) && appId) return `https://cdn.discordapp.com/app-assets/${appId}/${raw}.png`;
    return '';
}

async function fetchImageAsDataUri(url) {
    if (!url) return '';
    try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (!resp.ok) return '';
        const mime = resp.headers.get('content-type') || 'image/png';
        const buf = Buffer.from(await resp.arrayBuffer());
        return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
        return '';
    }
}

const DEFAULT_COLORS = {
    bg: '12284C',
    border: '30363d',
    accent: 'F51010',
    title: 'ffffff',
    text: 'c9d1d9',
    muted: '6e7681',
};

// Text defaults when the card is transparent: dark text for light mode,
// light text for dark mode (switched via prefers-color-scheme).
const ADAPTIVE_COLORS = {
    accent: { light: '#F51010', dark: '#F51010' },
    title: { light: '#1f2328', dark: '#ffffff' },
    text: { light: '#57606a', dark: '#c9d1d9' },
    muted: { light: '#848d97', dark: '#6e7681' },
};

function parseColor(query, key) {
    const val = String(query?.[key] ?? '');
    if (val === 'transparent' || val === 'none') return 'none';
    if (/^[0-9a-fA-F]{3}$/.test(val) || /^[0-9a-fA-F]{6}$/.test(val) || /^[0-9a-fA-F]{8}$/.test(val)) {
        return `#${val}`;
    }
    return null;
}

function buildTheme(query) {
    const bg = parseColor(query, 'bg') ?? `#${DEFAULT_COLORS.bg}`;
    const border = parseColor(query, 'border') ?? `#${DEFAULT_COLORS.border}`;
    const transparent = bg === 'none';

    const rules = [];
    const darkRules = [];
    for (const key of ['accent', 'title', 'text', 'muted']) {
        const explicit = parseColor(query, key);
        if (explicit) {
            rules.push(`.${key}{fill:${explicit}}`);
        } else if (transparent) {
            rules.push(`.${key}{fill:${ADAPTIVE_COLORS[key].light}}`);
            darkRules.push(`.${key}{fill:${ADAPTIVE_COLORS[key].dark}}`);
        } else {
            rules.push(`.${key}{fill:#${DEFAULT_COLORS[key]}}`);
        }
    }
    const colorStyle = `<style>${rules.join('')}${darkRules.length ? `@media(prefers-color-scheme:dark){${darkRules.join('')}}` : ''}</style>`;
    return { bg, border, colorStyle };
}

function truncate(str, max) {
    const s = String(str || '');
    return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function elapsed(startMs) {
    if (!startMs) return '';
    const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')} elapsed`;
}

export default async function handler(req, res) {
    const stored = await kv.get('latest_activity');
    const act = stored?.active_activity;

    const { bg, border, colorStyle } = buildTheme(req.query);

    const name = escapeXml(truncate(act?.name, 38));
    const details = escapeXml(truncate(act?.details, 28));
    const state = escapeXml(truncate(act?.state, 36));
    const imageUrl = resolveImageUrl(act?.assets?.large_image, act?.application_id);
    const image = escapeXml(await fetchImageAsDataUri(imageUrl));
    const time = escapeXml(elapsed(act?.timestamps?.start));

    const svg = act
        ? `
<svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
  ${FONT_STYLE}
  ${colorStyle}
  <rect width="400" height="120" rx="12" fill="${bg}" stroke="${border}"/>
  ${image ? `<clipPath id="art"><rect x="16" y="16" width="88" height="88" rx="8"/></clipPath>
  <image href="${image}" x="16" y="16" width="88" height="88" preserveAspectRatio="xMidYMid slice" clip-path="url(#art)"/>` : ''}
  <text x="${image ? 120 : 20}" y="34" font-family="Google Sans, Segoe UI, sans-serif" font-size="12" class="accent">${name}</text>
  <text x="${image ? 120 : 20}" y="58" font-family="Google Sans, Segoe UI, sans-serif" font-size="17" class="title" font-weight="bold">${details}</text>
  <text x="${image ? 120 : 20}" y="80" font-family="Google Sans, Segoe UI, sans-serif" font-size="13" class="text">${state}</text>
  <text x="${image ? 120 : 20}" y="100" font-family="Google Sans, Segoe UI, sans-serif" font-size="11" class="muted">${time}</text>
</svg>`.trim()
        : `
<svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
  ${FONT_STYLE}
  ${colorStyle}
  <rect width="400" height="120" rx="12" fill="${bg}" stroke="${border}"/>
  <text x="20" y="65" font-family="Google Sans, Segoe UI, sans-serif" font-size="14" class="muted">No active activity right now</text>
</svg>`.trim();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    res.status(200).send(svg);
}