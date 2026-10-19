export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!url) return 'http://localhost:3000';
  return new URL(url.includes('://') ? url : `https://${url}`).origin;
}
