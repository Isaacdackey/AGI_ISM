/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// Origine autorisée en connect-src, déduite de NEXT_PUBLIC_API_URL.
// URL relative (/api, via rewrites/cookies first-party) => 'self'.
function apiOrigin() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (!raw || raw.startsWith('/')) return "'self'";
  try {
    return new URL(raw).origin;
  } catch {
    return "'self'";
  }
}

const nextConfig = {
  poweredByHeader: false,
  // Recommandé en prod : NEXT_PUBLIC_API_URL=/api + BACKEND_URL défini
  // (rewrites => même origine, cookie first-party). L'URL absolue reste supportée.
  output: 'standalone',
  // Anciennes URLs /matieres (renommées /filieres) : redirection permanente.
  async redirects() {
    return [{ source: '/matieres/:path*', destination: '/filieres/:path*', permanent: true }];
  },
  async rewrites() {    const target = process.env.BACKEND_URL;
    if (target) return [{ source: '/api/:path*', destination: `${target}/api/:path*` }];
    if (!isProd) {
      return [{ source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' }];
    }
    return [];
  },
  async headers() {
    // Next.js dev (React Refresh) exige 'unsafe-inline' + 'unsafe-eval'.
    // En prod, Next a toujours besoin de 'unsafe-inline' pour ses scripts internes.
    const scriptSrc = isProd ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";
    const connectSrc = `'self' ${apiOrigin()}`;
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data:; frame-src 'self' blob:; connect-src ${connectSrc}; object-src 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
