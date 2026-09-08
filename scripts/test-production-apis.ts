/**
 * Exercises the four production-failing APIs against a running dev server.
 * Usage: npx tsx scripts/test-production-apis.ts
 */
import fs from "fs";
import path from "path";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function request(apiPath: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(`${BASE}${apiPath}`, { ...init, headers });
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  let json: unknown = null;
  if (contentType.includes("json")) {
    try {
      json = JSON.parse(text);
    } catch {
      // ignore
    }
  }
  return { status: res.status, json, text, contentType, ok: res.ok };
}

/** Minimal PNG (>200 bytes decoded) for signature tests */
function minimalSignatureDataUrl(): string {
  const pngPath = path.join(process.cwd(), "public", "icon.png");
  if (fs.existsSync(pngPath)) {
    const buf = fs.readFileSync(pngPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  }
  throw new Error("public/icon.png not found for signature test");
}

async function login(): Promise<string> {
  const res = await request("/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "vip080", password: "qwer1234" }),
  });
  const setCookie = (await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "vip080", password: "qwer1234" }),
  })).headers.get("set-cookie");
  if (!setCookie) throw new Error(`Login failed: ${JSON.stringify(res.json)}`);
  return setCookie.split(";")[0];
}

async function ensureContract(cookie: string): Promise<string> {
  const list = await request("/api/admin/contracts", {}, cookie);
  const contracts = (list.json as { data?: { contracts?: Array<{ id: string }> } })?.data?.contracts;
  if (contracts?.[0]?.id) return contracts[0].id;

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(today.getFullYear(), today.getMonth() + 6, 0).toISOString().slice(0, 10);
  const create = await request(
    "/api/admin/contracts",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
        companyName: "API테스트업체",
        representativeName: "홍길동",
        phone: "010-1234-5678",
        startDate: start,
        endDate: end,
        totalAmount: 1000000,
        vatIncluded: true,
      }),
    },
    cookie
  );
  const id = (create.json as { data?: { contract?: { id?: string } } })?.data?.contract?.id;
  if (!id) throw new Error(`Contract create failed: ${JSON.stringify(create.json)}`);
  return id;
}

async function testProviderSignature(cookie: string, contractId: string) {
  console.log("\n=== POST /api/admin/contracts/[id]/provider-signature ===");
  const res = await request(
    `/api/admin/contracts/${contractId}/provider-signature`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerName: "테스트관리자",
        signerTitle: "대표",
        signatureDataUrl: minimalSignatureDataUrl(),
      }),
    },
    cookie
  );
  console.log("STATUS", res.status);
  console.log("BODY", res.text.slice(0, 500));
  console.log("RESULT", res.ok ? "PASS" : "FAIL");
}

async function testFileUpload(cookie: string, contractId: string) {
  console.log("\n=== POST /api/submit/[token] ===");
  const uploadShare = await request(
    `/api/admin/contracts/${contractId}/upload-share`,
    { method: "POST" },
    cookie
  );
  const token = (uploadShare.json as { data?: { shareToken?: { token?: string } }; url?: string })?.data?.shareToken?.token;
  if (!token) {
    console.log("UPLOAD_SHARE_FAIL", JSON.stringify(uploadShare.json));
    return;
  }

  const pngPath = path.join(process.cwd(), "public", "icon.png");
  const fileBuf = fs.readFileSync(pngPath);
  const form = new FormData();
  form.append("category", "OTHER");
  form.append("files", new Blob([fileBuf], { type: "image/png" }), "test-upload.png");

  const res = await fetch(`${BASE}/api/submit/${token}`, { method: "POST", body: form });
  const text = await res.text();
  console.log("STATUS", res.status);
  console.log("BODY", text.slice(0, 500));
  console.log("RESULT", res.ok ? "PASS" : "FAIL");
}

async function testDraftPdf(cookie: string, contractId: string) {
  console.log("\n=== GET /api/admin/contracts/[id]/pdf/draft ===");
  const res = await request(`/api/admin/contracts/${contractId}/pdf/draft`, {}, cookie);
  console.log("STATUS", res.status);
  console.log("CONTENT_TYPE", res.contentType);
  console.log("BODY_PREVIEW", res.text.slice(0, 200));
  console.log("RESULT", res.ok && res.contentType.includes("pdf") ? "PASS" : "FAIL");
}

async function testSharedSignedPdf(cookie: string, contractId: string) {
  console.log("\n=== GET /api/shared-contracts/[token]/pdf ===");
  const contractRes = await request(`/api/admin/contracts/${contractId}`, {}, cookie);
  const contract = (contractRes.json as { data?: { contract?: Record<string, unknown> } })?.data?.contract;
  const shareTokens = (contract?.shareTokens as Array<{ token: string; type: string; isActive: boolean }>) ?? [];
  const signToken = shareTokens.find((t) => t.type === "CONTRACT_SIGN" && t.isActive)?.token;
  if (!signToken) {
    console.log("SKIP", "No active CONTRACT_SIGN token — status:", contract?.status);
    return;
  }
  const res = await request(`/api/shared-contracts/${signToken}/pdf`, {});
  console.log("STATUS", res.status);
  console.log("CONTENT_TYPE", res.contentType);
  console.log("BODY_PREVIEW", res.text.slice(0, 300));
  console.log("RESULT", res.ok && res.contentType.includes("pdf") ? "PASS" : "FAIL");
}

async function main() {
  console.log("BASE_URL", BASE);
  const cookie = await login();
  console.log("LOGIN OK");
  const contractId = await ensureContract(cookie);
  console.log("CONTRACT_ID", contractId);

  await testProviderSignature(cookie, contractId);
  await testFileUpload(cookie, contractId);
  await testDraftPdf(cookie, contractId);
  await testSharedSignedPdf(cookie, contractId);
}

main().catch((err) => {
  console.error("SCRIPT_FATAL", err);
  process.exit(1);
});
