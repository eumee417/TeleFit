"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "../theme-provider";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "홈", href: "/" },
  { label: "AI 추천", href: "/chatbot" },
  { label: "요금제 조회", href: "/plans" },
  { label: "비용 계산기", href: "/calculator" },
];

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav
      className="sticky top-0 z-50 border-b border-[var(--border-5)] backdrop-blur-md transition-colors"
      style={{ background: "var(--bg-nav)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-display text-[var(--text-main)]"
              style={{ background: "linear-gradient(135deg, var(--color-cyan-400), #3b82f6)" }}
            >
              T
            </div>
            <span className="text-[var(--text-main)] font-bold text-lg tracking-tight font-display">텔레핏</span>
          </Link>

          {/* 데스크톱 메뉴 */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "nav-item-active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* 데스크톱 액션 버튼 */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-60)] hover:text-[var(--text-main)] border border-[var(--border-10)] hover:border-[var(--border-20)] transition-all bg-[var(--bg-02)]"
              aria-label="테마 변경"
            >
              {theme === "dark" ? "🌞" : "🌙"}
            </button>
            <button className="btn-outline">로그인</button>
            <button className="btn-primary !px-4 !py-2 !text-sm">무료 시작</button>
          </div>

          {/* 모바일 액션 및 햄버거 */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-60)] hover:text-[var(--text-main)] border border-[var(--border-10)]"
            >
              {theme === "dark" ? "🌞" : "🌙"}
            </button>
            <button
              className="p-2 text-[var(--text-60)] hover:text-[var(--text-main)]"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 드로어 */}
        {menuOpen && (
          <div className="md:hidden border-t border-[var(--border-5)] py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`nav-item block w-full text-left ${pathname === item.href ? "nav-item-active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 px-4 flex gap-3">
              <button className="btn-outline flex-1">로그인</button>
              <button className="btn-primary flex-1 !px-0 !py-2 !text-sm">무료 시작</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
