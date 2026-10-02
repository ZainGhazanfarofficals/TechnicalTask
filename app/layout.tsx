import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./ui.css";
import { Toaster } from "sonner";

// Coinbase Sans/Display are licensed; Inter is the closest open substitute.
const sans = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create an account as a user, or sign in as an admin.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
