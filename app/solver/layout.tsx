import type { Metadata } from 'next'

// Hidden tool: not linked anywhere, kept out of search engines
export const metadata: Metadata = {
  title: 'switch solver',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
