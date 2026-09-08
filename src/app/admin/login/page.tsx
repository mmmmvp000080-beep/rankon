"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileCheck2, Shield, Signature } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useToast } from "@/components/ui/Toast";
import { BRAND } from "@/lib/brand";
import { LOGO_HEIGHT } from "@/lib/logo-assets";

export default function AdminLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/admin");
        router.refresh();
      } else {
        showToast(data.message || "로그인 정보가 올바르지 않습니다", "error");
      }
    } catch {
      showToast("로그인 중 오류가 발생했습니다", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="ui-login-brand relative hidden w-[48%] flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16">
        <div className="ui-login-grid" />
        <div className="ui-login-glow" />

        <div className="relative z-10 py-2">
          <BrandLogo layout="full" color="white" height={LOGO_HEIGHT.login} priority />
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-primary-light/90">
            {BRAND.tagline}
          </p>
          <h2 className="ui-login-brand-title mt-5 text-[2rem] xl:text-[2.35rem]">
            {BRAND.nameKo} 계약관리 시스템
          </h2>
          <p className="ui-login-brand-desc mt-5 text-[0.9375rem] leading-relaxed">
            {BRAND.slogan}
            <br />
            전자계약 작성, 서명, 문서 보관까지 하나의 운영 플랫폼에서 관리합니다.
          </p>

          <div className="mt-10 flex flex-wrap gap-2.5">
            <span className="ui-feature-pill">
              <FileCheck2 size={14} className="text-brand-primary-light" />
              계약 관리
            </span>
            <span className="ui-feature-pill">
              <Signature size={14} className="text-brand-primary-light" />
              전자서명
            </span>
            <span className="ui-feature-pill">
              <Shield size={14} className="text-brand-primary-light" />
              보안 문서
            </span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="ui-login-brand-footer text-xs">
            © {new Date().getFullYear()} {BRAND.fullName}. All rights reserved.
          </p>
        </div>
      </div>

      <div className="ui-login-form-panel w-full px-6 py-12 lg:w-[52%]">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <p className="text-sm font-semibold text-brand-primary">Admin Access</p>
            <h1 className="ui-login-form-heading mt-1 text-[1.75rem] text-brand-text">
              운영 플랫폼 접속
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted">
              {BRAND.nameKo} 관리자 계정으로 로그인하세요
            </p>
          </div>

          <div className="ui-login-card">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-text-secondary">
                  아이디
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="ui-input"
                  placeholder="아이디를 입력하세요"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-text-secondary">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input"
                  placeholder="비밀번호를 입력하세요"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="ui-btn ui-btn-primary ui-btn-lg group w-full"
              >
                {loading ? (
                  <>
                    <span className="ui-loading-spinner !mb-0 !h-4 !w-4 !border-2 !border-black/20 !border-t-black/70" />
                    로그인 중...
                  </>
                ) : (
                  <>
                    로그인
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
