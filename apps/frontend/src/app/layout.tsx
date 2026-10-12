import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { GlobalProgressBar } from "@/components/global-progress-bar";
import { Toaster } from "@/components/ui/toast";
import { Providers } from "@/components/providers";
import { SiteAnalytics } from "@/components/site-analytics";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: "WARAH - Gérez vos biens. Encaissez vos loyers. Dormez tranquille.",
  description: "WARAH - Plateforme de gestion locative immobilière pour le Togo",
  // URL canonique (Search Console : « page en double sans URL canonique ») :
  // sans elle, `/annonces?ville=…` ou `/?utm_source=…` passent pour des
  // doublons. Hérité par toutes les routes : chaque page PUBLIQUE déclare la
  // sienne (layout ou metadata de la page), sinon elle pointerait vers
  // l'accueil. Les pages privées sont exclues par robots.ts.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
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
        <SiteAnalytics />
      </body>
    </html>
  );
}
