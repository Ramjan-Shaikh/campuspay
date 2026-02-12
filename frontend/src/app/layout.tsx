import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WalletProvider } from "../context/WalletContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CampusPay",
  description: "Decentralized campus finance on Algorand Testnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <div className="cp-gradient-bg">
          <div className="cp-gradient-blob" />
          <div className="cp-gradient-blob" />
          <div className="cp-gradient-blob" />
        </div>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
