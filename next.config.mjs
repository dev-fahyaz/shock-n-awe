function imageHosts() {
  const hosts = new Set(
    (process.env.SCENE_IMAGE_HOSTS ?? '')
      .split(',')
      .map(h => h.trim())
      .filter(Boolean),
  );
  try {
    const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabase) hosts.add(new URL(supabase).hostname);
  } catch {
    /* ignore invalid URL */
  }
  return [...hosts].map(hostname => ({ protocol: 'https', hostname }));
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: config => {
    config.resolve.alias.canvas = false;
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Stage/viewers prefer <img> for dynamic Storage URLs. This list is for
    // any remaining next/image use; the Supabase host is taken from the
    // project URL at build (Compose already passes NEXT_PUBLIC_SUPABASE_URL).
    remotePatterns: imageHosts(),
  },
};

/**
 * Analytics IDs must never be interpolated into a script URL when unset —
 * that is exactly how the live NYC page ended up requesting
 * `gtm.js?id=undefined` and recording nothing.
 *
 * Fail the production build instead of shipping a broken tag.
 */
if (process.env.NODE_ENV === 'production' && process.env.SKIP_ENV_CHECK !== '1') {
  const required = ['NEXT_PUBLIC_GTM_ASAT', 'NEXT_PUBLIC_GTM_ASPIRE'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `[shock-and-awe] missing required env: ${missing.join(', ')}\n` +
        'Set them, or pass SKIP_ENV_CHECK=1 for a deliberately untagged build.',
    );
  }
}

export default nextConfig;
