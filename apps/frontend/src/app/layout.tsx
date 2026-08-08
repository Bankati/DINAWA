import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { GlobalProgressBar } from "@/components/global-progress-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "WARAH - Gérez vos biens. Encaissez vos loyers. Dormez tranquille.",
  description: "WARAH - Plateforme de gestion locative immobilière pour le Togo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <GlobalProgressBar />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
