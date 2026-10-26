import type { NextConfig } from 'next'
import { execSync } from 'node:child_process'

// Date of the latest commit (shown in the info tab); the build time if git is not available
const updatedAt = (() => {
  try { return execSync('git log -1 --format=%cI', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || new Date().toISOString(); }
  catch { return new Date().toISOString(); }
})()

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_UPDATED_AT: updatedAt },
  async redirects() {
    return [
      {
        source: '/julie',
        destination: '/g?c=11111311142241124343244112441431123141311413221112441431134421111244143111141111&cs=8x10',
        permanent: true,
      },
    ]
  },
}

export default nextConfig