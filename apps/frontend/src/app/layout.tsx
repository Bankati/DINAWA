import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { GlobalProgressBar } from "@/components/global-progress-bar";
import { Toaster } from "@/components/ui/toast";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "WARAH - Gérez vos biens. Encaissez vos loyers. Dormez tranquille.",
  description: "WARAH - Plateforme de gestion locative immobilière pour le Togo",
  // Vérification de propriété Google Search Console — l'API Metadata de
  // Next.js génère automatiquement la balise <meta name="google-site-verification" ...>.
  verification: {
    google: "wF1k87RI6uWyieVtvTCRZDjkyUzXNGwXAuwnGxX_7GU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>
          <GlobalProgressBar />
          <Toaster />
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
