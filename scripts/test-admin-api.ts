const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

async function request(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { status: res.status, json, text, setCookie: res.headers.get("set-cookie") };
}

async function main() {
  console.log("=== LOGIN TEST ===");
  const login = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username: "vip080", password: "qwer1234" }),
  });
  console.log("LOGIN_STATUS", login.status);
  console.log("LOGIN_BODY", JSON.stringify(login.json));

  if (login.status !== 200 || !login.setCookie) {
    console.log("LOGIN_RESULT", "FAIL");
    process.exit(1);
  }
  const cookie = login.setCookie.split(";")[0];
  console.log("LOGIN_RESULT", "PASS");

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const end = new Date(today.getFullYear(), today.getMonth() + 6, 0)
    .toISOString()
    .slice(0, 10);

  console.log("\n=== CONTRACT CREATE TEST ===");
  const create = await request(
    "/api/admin/contracts",
    {
      method: "POST",
      body: JSON.stringify({
        contractType: "NAVER_PLACE_MONTHLY_MANAGEMENT",
        companyName: "테스트업체",
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
  console.log("CREATE_STATUS", create.status);
  console.log("CREATE_BODY", JSON.stringify(create.json));

  const contractId = (create.json as { data?: { contract?: { id?: string } } })?.data?.contract?.id;
  if (!contractId) {
    console.log("CREATE_RESULT", "FAIL");
    process.exit(1);
  }
  console.log("CREATE_RESULT", "PASS", contractId);

  console.log("\n=== CONTRACT READ TEST ===");
  const read = await request(`/api/admin/contracts/${contractId}`, {}, cookie);
  console.log("READ_STATUS", read.status);
  const readCompany = (read.json as { data?: { contract?: { companyName?: string } } })?.data?.contract
    ?.companyName;
  console.log("READ_COMPANY", readCompany);
  console.log("READ_RESULT", read.status === 200 && readCompany === "테스트업체" ? "PASS" : "FAIL");

  console.log("\n=== CONTRACT DELETE TEST ===");
  const del = await request(`/api/admin/contracts/${contractId}`, { method: "DELETE" }, cookie);
  console.log("DELETE_STATUS", del.status);
  console.log("DELETE_BODY", JSON.stringify(del.json));

  const readAfter = await request(`/api/admin/contracts/${contractId}`, {}, cookie);
  console.log("READ_AFTER_DELETE_STATUS", readAfter.status);
  console.log(
    "DELETE_RESULT",
    del.status === 200 && readAfter.status === 404 ? "PASS" : "FAIL"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
