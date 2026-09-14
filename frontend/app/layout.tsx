import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import Navigation from "./components/Navigation";

export const metadata: Metadata = {
  title: "텔레핏 | TeleFit",
  description: "통신 요금 비교 서비스",
};

// 첫 페인트 전에 저장된 테마를 <html>에 적용해 라이트/다크 깜빡임(FOUC)을 방지한다.
// App.tsx의 useEffect 기반 테마 적용 로직을 SSR 환경에 맞게 옮긴 것.
const THEME_INIT_SCRIPT = `(function () {
  try {
    var saved = localStorage.getItem("telefit-theme");
    var theme = saved === "light" ? "light" : "dark";
    document.documentElement.className = "theme-" + theme;
  } catch (e) {
    document.documentElement.className = "theme-dark";
  }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko"suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <div className="min-h-full flex flex-col transition-colors">
            <Navigation />
            <main className="flex-1">{children}</main>
            <footer
              className="border-t border-[var(--border-5)] py-8 text-center text-sm text-[var(--text-40)]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              © 2026 텔레핏(TeleFit). 통신 요금 비교 서비스. 실제 요금은 통신사 홈페이지를 확인하세요.
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
