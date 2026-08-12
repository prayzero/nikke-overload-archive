import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";
const canonicalUrl = new URL(`${siteUrl.replace(/\/+$/, "")}/`);
const deploymentRoot = assetPrefix
  ? new URL(`${assetPrefix.replace(/\/+$/, "")}/`, canonicalUrl)
  : canonicalUrl;
const publicUrl = (pathname: string) =>
  new URL(pathname.replace(/^\/+/, ""), deploymentRoot).toString();

const previewImage = publicUrl("og.png");
const iconImage = publicUrl("icon.png");
const largeIconImage = publicUrl("icon-512.png");
const shortcutIcon = publicUrl("favicon.ico");
const manifestUrl = publicUrl("manifest.webmanifest");
// The static post-build step replaces this navigation-safe baseline with a
// hash-authorized policy before anything is published.
const contentSecurityPolicy = [
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const metadata: Metadata = {
  metadataBase: canonicalUrl,
  title: "NIKKE // OVERLOAD ARCHIVE",
  description: "196명 전체 니케의 보유 현황과 캐릭터별 4×3 오버로드 추천을 관리하는 비공식 팬 아카이브.",
  referrer: "no-referrer",
  alternates: {
    canonical: canonicalUrl,
  },
  manifest: manifestUrl,
  icons: {
    icon: [
      { url: shortcutIcon, type: "image/x-icon", sizes: "16x16 32x32 48x48" },
      { url: iconImage, type: "image/png", sizes: "192x192" },
      { url: largeIconImage, type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: iconImage, type: "image/png", sizes: "192x192" }],
  },
  openGraph: {
    title: "NIKKE // OVERLOAD ARCHIVE",
    description: "196명 전원의 보유 현황과 캐릭터별 4×3 오버로드 세팅을 한곳에서.",
    type: "website",
    locale: "ko_KR",
    url: canonicalUrl,
    images: [
      {
        url: previewImage,
        width: 1200,
        height: 630,
        alt: "NIKKE Overload Archive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NIKKE // OVERLOAD ARCHIVE",
    description: "196명 전원의 보유 현황과 캐릭터별 4×3 오버로드 세팅을 한곳에서.",
    images: [previewImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={contentSecurityPolicy} />
      </head>
      <body>{children}</body>
    </html>
  );
}
