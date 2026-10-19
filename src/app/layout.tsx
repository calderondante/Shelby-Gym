import type { Metadata, Viewport } from "next";
import "./globals.css";

// Every HTML response needs a fresh CSP nonce and must not cache staff sessions.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Shelby Gym", template: "%s · Shelby Gym" },
  description: "Gestión de clientes, actividades y cuotas de Shelby Gym.",
  robots: { index: false, follow: false },
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
      <body>{children}</body>
    </html>
  );
}
