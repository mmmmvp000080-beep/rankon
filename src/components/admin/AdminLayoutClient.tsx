"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  PanelLeftClose,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND } from "@/lib/brand";
import { LOGO_HEIGHT } from "@/lib/logo-assets";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/admin/contracts", label: "계약관리", icon: FileText },
  { href: "/admin/files", label: "파일관리", icon: FolderOpen },
  { href: "/admin/settings", label: "환경설정", icon: Settings },
];

function SidebarNavItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`ui-nav-item ${active ? "ui-nav-item-active" : ""}`}
    >
      <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
      <span>{label}</span>
    </Link>
  );
}

export function AdminLayoutClient({
  children,
  title,
  description,
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const sidebar = (
    <aside className="ui-sidebar w-[260px] shrink-0">
      <div className="relative z-10 flex items-center justify-between border-b border-white/6 px-4 py-5">
        <Link href="/admin" onClick={() => setSidebarOpen(false)} className="block min-w-0">
          <BrandLogo layout="full" color="white" height={LOGO_HEIGHT.sidebar} priority />
        </Link>
      </div>

      <div className="relative z-10 px-3 pt-2">
        <div className="mb-4 rounded-[8px] border border-white/6 bg-white/3 px-3 py-2.5">
          <p className="text-[0.6875rem] font-medium leading-tight text-white/45">
            {BRAND.description}
          </p>
        </div>
      </div>

      <nav className="relative z-10 flex-1 space-y-0.5 px-2 py-1">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href, item.exact)}
          />
        ))}
      </nav>

      <div className="relative z-10 border-t border-white/6 p-3">
        <div className="mb-2 px-3">
          <p className="text-[0.6875rem] font-medium uppercase tracking-wider text-white/30">
            {BRAND.nameKo}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="ui-nav-item w-full border-none bg-transparent text-left"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-brand-bg">
      <div className="hidden md:block">{sidebar}</div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full shadow-2xl">
            <aside className="ui-sidebar w-[260px]">
              <div className="flex items-center justify-between border-b border-white/6 px-4 py-5">
                <Link href="/admin" onClick={() => setSidebarOpen(false)}>
                  <BrandLogo layout="full" color="white" height={LOGO_HEIGHT.sidebar} priority />
                </Link>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-[8px] p-1.5 text-white/50 hover:bg-white/8 hover:text-white"
                  aria-label="메뉴 닫기"
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>
              <nav className="relative z-10 flex-1 space-y-0.5 px-2 py-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`ui-nav-item ${active ? "ui-nav-item-active" : ""}`}
                    >
                      <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="relative z-10 border-t border-white/6 p-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ui-nav-item w-full border-none bg-transparent text-left"
                >
                  <LogOut size={18} strokeWidth={1.75} />
                  로그아웃
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="ui-header">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-[10px] p-2 text-brand-text-secondary transition-colors hover:bg-brand-bg-secondary md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="메뉴 열기"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-[1.0625rem] font-semibold tracking-tight text-brand-text">
                {title || BRAND.nameKo}
              </h1>
              {description && (
                <p className="text-xs text-brand-muted">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 overflow-auto p-5 md:p-7">{children}</main>
      </div>
    </div>
  );
}
