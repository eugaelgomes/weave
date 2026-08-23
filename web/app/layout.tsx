import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import AuthProviderClient from "./_contexts/auth-provider-client";
import { Toaster } from "@/app/sonner";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "./_contexts/theme-context";
import { LanguageProvider } from "./_contexts/language-context";
import { InternetConnectionMonitor } from "./_components/internet-connection-monitor";
import { VersionMonitor } from "./_components/version-monitor";
import { getSiteOrigin } from "@/lib/site-url";
import { cn } from "@/lib/utils";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const siteOrigin = getSiteOrigin();

const siteTitle = "Weave";
const siteDescription =
  "Weave é uma plataforma proativa de gestão de projetos que usa inteligência artificial para ajudar equipes a organizar, acompanhar e entregar projetos de forma mais inteligente e eficiente.";

const ogImages: Array<{ url: string; width: number; height: number; alt: string; type: string }> = [
  {
    url: "/og-image.png",
    width: 1491,
    height: 687,
    alt: siteTitle,
    type: "image/png",
  },
  {
    url: "/og-image.webp",
    width: 1491,
    height: 687,
    alt: siteTitle,
    type: "image/webp",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteOrigin}/#website`,
      url: `${siteOrigin}/`,
      name: siteTitle,
      description: siteDescription,
      inLanguage: "en-US",
      publisher: { "@id": `${siteOrigin}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${siteOrigin}/#organization`,
      name: "Weave",
      url: siteOrigin,
      logo: `${siteOrigin}/weave.png`,
    },
    {
      "@type": "SoftwareApplication",
      name: "Weave",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteOrigin,
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "Weave",
    template: "Weave - %s",
  },
  description: siteDescription,
  keywords: [
    "workspace",
    "intelligent",
    "team",
    "productivity",
    "organization",
    "collaboration",
    "ai",
    "weave ai",
    "weave engine",
    "assistant",
    "workflow",
    "automation",
  ],
  authors: [
    { name: "Weave", url: siteOrigin },
    { name: "Gael Renê Gomes", url: "https://gaelgomes.dev" },
  ],
  creator: "Gael Renê Gomes",
  publisher: "Gael Renê Gomes",
  applicationName: "Weave",
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: siteTitle,
    description: siteDescription,
    siteName: siteTitle,
    images: ogImages as any,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  category: "productivity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" className={fredoka.variable} suppressHydrationWarning>
      <head>
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var MAX_RETRIES = 3;
                var COOLDOWN_MS = 5000;
                var STORAGE_KEY = 'chunk_reload_state';

                function getState() {
                  try {
                    var raw = sessionStorage.getItem(STORAGE_KEY);
                    return raw ? JSON.parse(raw) : { count: 0, lastAttempt: 0 };
                  } catch(e) {
                    return { count: 0, lastAttempt: 0 };
                  }
                }

                function setState(state) {
                  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
                }

                function isChunkError(msg) {
                  if (!msg) return false;
                  return msg.includes('ChunkLoadError')
                    || msg.includes('Failed to fetch dynamically imported module')
                    || msg.includes('Loading chunk')
                    || (msg.includes('MIME type') && msg.includes('not executable'));
                }

                function handleChunkError() {
                  var state = getState();
                  var now = Date.now();

                  // Cooldown: no more than 1 reload per COOLDOWN_MS
                  if (now - state.lastAttempt < COOLDOWN_MS) return;

                  if (state.count >= MAX_RETRIES) {
                    // Exhausted retries — clear state and show notice
                    sessionStorage.removeItem(STORAGE_KEY);
                    // Don't show if we already showed
                    if (!sessionStorage.getItem('chunk_notice_shown')) {
                      sessionStorage.setItem('chunk_notice_shown', '1');
                      if (typeof document !== 'undefined') {
                        var banner = document.createElement('div');
                        banner.setAttribute('style', 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#fbbf24;color:#1a1a1a;padding:12px 20px;text-align:center;font:14px/1.4 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.15)');
                        banner.innerHTML = 'A new version is available. <button onclick="window.location.href=window.location.pathname" style="margin-left:12px;padding:4px 16px;background:#1a1a1a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Update now</button>';
                        document.body.appendChild(banner);
                      }
                    }
                    return;
                  }

                  // Increment counter and attempt reload
                  setState({ count: state.count + 1, lastAttempt: now });

                  // Clear caches before reloading
                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      names.forEach(function(name) { caches.delete(name); });
                    }).catch(function() {});
                  }

                  // Unregister service workers
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      regs.forEach(function(r) { r.unregister(); });
                    }).catch(function() {});
                  }

                  // Small delay to allow cache/SW cleanup
                  setTimeout(function() {
                    window.location.reload();
                  }, 200);
                }

                // Capture script load errors (404 on chunk files)
                window.addEventListener('error', function(event) {
                  var msg = event.message || '';
                  var isScriptError = event.target && event.target.tagName === 'SCRIPT' && event.type === 'error';
                  if (isChunkError(msg) || isScriptError) {
                    handleChunkError();
                  }
                }, true);

                // Capture async chunk load failures
                window.addEventListener('unhandledrejection', function(event) {
                  var msg = event.reason ? (event.reason.message || String(event.reason)) : '';
                  if (isChunkError(msg)) {
                    handleChunkError();
                  }
                });

                // Reset state on successful page load
                window.addEventListener('load', function() {
                  var state = getState();
                  if (state.count > 0) {
                    // Page loaded successfully after retry — reset
                    sessionStorage.removeItem(STORAGE_KEY);
                    sessionStorage.removeItem('chunk_notice_shown');
                  }
                });
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log(
                "%c" +
                "  ██╗   ██╗ ███████╗  █████╗  ██╗   ██╗ ███████╗\\n" +
                "  ██║   ██║ ██╔════╝ ██╔══██╗ ██║   ██║ ██╔════╝\\n" +
                "  ██║██╗██║ █████╗   ███████║ ██║   ██║ █████╗  \\n" +
                "  ████████║ ██╔══╝   ██╔══██║ ╚██╗ ██╔╝ ██╔══╝  \\n" +
                "  ╚██████╔╝ ███████╗ ██║  ██║  ╚████╔╝  ███████╗\\n" +
                "\\n" +
                "  %cWeave %c— Enterprise AI Agent & Workflow Engine\\n" +
                "  %cCreated by Gael R. Gomes <gael.rens@gmail.com> (https://gaelgomes.dev)\\n",
                "color: #FFD500; font-family: monospace; font-weight: bold;",
                "color: #FFD500; font-family: monospace; font-weight: bold;",
                "color: gray; font-family: monospace;",
                "color: gray; font-family: monospace;"
              );
              console.log(
                "%c⚠️ Stop!\\n\\n%cThis is a browser feature intended for developers.\\nIf someone told you to copy and paste something here, it is a scam and will give them access to your account and organization data.",
                "color: red; font-size: 24px; font-weight: bold;",
                "color: inherit; font-size: 14px;"
              );
            `,
          }}
        />
        <Analytics />
      </head>
      <body className={cn("antialiased", fredoka.variable)} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProviderClient>
            <LanguageProvider>{children}</LanguageProvider>
          </AuthProviderClient>
          <InternetConnectionMonitor />
          <VersionMonitor />
          <Toaster position="top-right" expand closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
