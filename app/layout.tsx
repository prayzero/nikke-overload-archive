import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";
const previewImage = new URL(`${assetPrefix}/og.png`, siteUrl).toString();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "NIKKE // OVERLOAD ARCHIVE",
  description: "보유 니케와 4×3 오버로드 추천 옵션을 관리하는 비공식 팬 아카이브.",
  icons: {
    icon: previewImage,
  },
  openGraph: {
    title: "NIKKE // OVERLOAD ARCHIVE",
    description: "196명의 보유 현황과 4×3 오버로드 세팅을 한곳에서.",
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: previewImage,
        width: 1736,
        height: 910,
        alt: "NIKKE Overload Archive",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NIKKE // OVERLOAD ARCHIVE",
    description: "196명의 보유 현황과 4×3 오버로드 세팅을 한곳에서.",
    images: [previewImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
