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
    // Scene assets are dynamic: a stage background or page image may live on a
    // CDN, in S3, or on a CMS host. Add each origin here, or next/image throws
    // at request time. Viewers that render user-supplied images deliberately
    // use a plain <img> so an unlisted host degrades instead of erroring.
    remotePatterns: (process.env.SCENE_IMAGE_HOSTS ?? '')
      .split(',')
      .map(h => h.trim())
      .filter(Boolean)
      .map(hostname => ({ protocol: 'https', hostname })),
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
