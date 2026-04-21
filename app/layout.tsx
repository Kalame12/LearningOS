import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Providers from "@/components/providers";
import FloatingChatbot from "@/components/FloatingChatbot";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Saarthi AI 🚀",
  description: "AI-powered career roadmap system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white">

        {/* ✅ FIX: wrap with Providers */}
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <FloatingChatbot />
        </Providers>

      </body>
    </html>
  );
}