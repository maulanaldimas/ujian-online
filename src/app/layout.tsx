import { Space_Grotesk, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "Ujian Online Rekrutmen",
    template: "%s | Ujian Online Rekrutmen",
  },
  description:
    "Aplikasi ujian online untuk proses rekrutmen dan evaluasi karyawan PT Sokka Tama Fiber dengan pengawasan proctoring.",
  applicationName: "Ujian Online Rekrutmen",
  keywords: ["ujian online", "rekrutmen", "assesment", "PT Sokka Tama Fiber"],
  authors: [{ name: "Tim Human Capital PT Sokka Tama Fiber" }],
  openGraph: {
    title: "Ujian Online Rekrutmen",
    description:
      "Aplikasi ujian online untuk proses rekrutmen dan evaluasi karyawan PT Sokka Tama Fiber.",
    type: "website",
    locale: "id_ID",
  },
  icons: {
    icon: "/logo.png",
  },
};

export const viewport = {
  themeColor: "#10192E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
