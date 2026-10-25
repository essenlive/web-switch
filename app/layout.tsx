import type { Metadata } from "next";
import "./globals.css";
import { Nunito } from 'next/font/google'
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from 'react'
import Script from 'next/script'
import { MotionProvider } from "@/components/motion-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { THEME_IDS } from "@/lib/themes"


const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "switch",
  description: "Switch lines mini game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {  

  return (
    <html lang="en" className={nunito.className} suppressHydrationWarning>

      {process.env.NODE_ENV !== "development" && process.env.NEXT_PUBLIC_ANALYTICS_SERVER_URL && 
      <Script 
          defer
          src={`${process.env.NEXT_PUBLIC_ANALYTICS_SERVER_URL}/script.js` }
          data-website-id={process.env.NEXT_PUBLIC_ANALYTICS_ID}
          strategy="afterInteractive" 
        />
    }

      <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            themes={THEME_IDS}
            disableTransitionOnChange
          >
            <main  className={`overscroll-contain antialiased  text-foreground relative flex flex-col p-4 space-y-2 justify-start min-h-dvh max-w-xl mx-auto`}>

            <MotionProvider>
            <Header />
            <Suspense>
              { children }

            </Suspense>
            </MotionProvider>

            </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
