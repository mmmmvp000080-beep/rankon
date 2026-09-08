export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

export function jsonNoStore(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}
