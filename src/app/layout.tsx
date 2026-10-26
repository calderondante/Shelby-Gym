import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/components/shared/pwa-provider";
import "./globals.css";

// Every HTML response needs a fresh CSP nonce and must not cache staff sessions.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Shelby Gym", template: "%s · Shelby Gym" },
  description: "Gestión de clientes, actividades y cuotas de Shelby Gym.",
  robots: { index: false, follow: false },
  applicationName: "Shelby Gym",
  appleWebApp: { capable: true, title: "Shelby Gym", statusBarStyle: "black" },
  // Next emits the unprefixed capable tag; preserve compatibility with older iOS.
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: "/brand/app-192.png",
    apple: {
      url: "/brand/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0B0D",
  colorScheme: "dark",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark">
      <body>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
