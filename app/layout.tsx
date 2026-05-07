import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai-todo-manager.vercel.app';
const TITLE = 'AI 할 일 관리 서비스';
const DESCRIPTION = 'AI가 도와주는 똑똑한 할 일 관리 서비스';

export const metadata: Metadata = {
  /* ── 기본 메타데이터 ── */
  title: {
    default: TITLE,
    template: `%s | ${TITLE}`,
  },
  description: DESCRIPTION,
  applicationName: TITLE,
  keywords: ['할 일', 'todo', 'AI', '생산성', '일정 관리', '할일 관리'],
  authors: [{ name: 'AI Todo Manager Team' }],
  creator: 'AI Todo Manager',

  /* ── 검색 엔진 ── */
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: '/',
  },

  /* ── Open Graph & SNS ── */
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: APP_URL,
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
  },

  /* ── 아이콘 및 카테고리 (중복 해결) ── */
  category: 'productivity',
  // layout.tsx의 icons 부분을 아래와 같이 수정
  icons: {
    icon: [
      { url: '/favicon.ico?v=1.1' }, // 뒤에 ?v=1.1 을 붙입니다.
      { url: '/logo.png?v=1.1', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png?v=1.1', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}