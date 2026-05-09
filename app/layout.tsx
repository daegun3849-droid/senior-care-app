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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://senior-care-app.vercel.app';
const TITLE = '노인복지관 어르신 돌봄';
const DESCRIPTION =
  '노인복지관에서 어르신 하루를 돕는 서비스입니다. 큰 글씨로 복약·건강·프로그램·일정을 쉽게 확인하고, 말로도 입력할 수 있어요.';

export const metadata: Metadata = {
  /* ── 기본 메타데이터 ── */
  title: {
    default: TITLE,
    template: `%s | ${TITLE}`,
  },
  description: DESCRIPTION,
  applicationName: TITLE,
  keywords: [
    '노인복지관',
    '어르신',
    '돌봄',
    '복지관 프로그램',
    '복약',
    '건강',
    '일정',
    '음성 입력',
  ],
  authors: [{ name: '노인복지관 어르신 돌봄' }],
  creator: '노인복지관 어르신 돌봄',

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-stone-100 text-stone-900`}>
        {children}
      </body>
    </html>
  );
}