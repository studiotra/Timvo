import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Timvo — Time tracking for freelancers and agencies",
  description:
    "Track yourself, submit to agencies, and approve contractor time against end-client work.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Timvo — Time tracking for freelancers and agencies",
    description:
      "Track yourself, submit to agencies, and approve contractor time against end-client work.",
    images: [{ url: "/brand/og.png", width: 1024, height: 1024, alt: "Timvo" }],
  },
  twitter: {
    card: "summary",
    title: "Timvo — Time tracking for freelancers and agencies",
    description:
      "Track yourself, submit to agencies, and approve contractor time against end-client work.",
    images: ["/brand/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
