import { Space_Grotesk, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { LOGO_SRC, NAMA_PERUSAHAAN } from "@/lib/constants";
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
    `Aplikasi ujian online untuk proses rekrutmen dan evaluasi karyawan ${NAMA_PERUSAHAAN} dengan pengawasan proctoring.`,
  applicationName: "Ujian Online Rekrutmen",
  keywords: ["ujian online", "rekrutmen", "assessment", NAMA_PERUSAHAAN],
  authors: [{ name: `Tim Human Capital ${NAMA_PERUSAHAAN}` }],
  openGraph: {
    title: "Ujian Online Rekrutmen",
    description:
      `Aplikasi ujian online untuk proses rekrutmen dan evaluasi karyawan ${NAMA_PERUSAHAAN}.`,
    type: "website",
    locale: "id_ID",
  },
  icons: {
    icon: LOGO_SRC,
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
