import type { Metadata } from "next";
import { buildSubmitShareMetadata, resolveMetadataBaseFromHeaders } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { token } = await params;
  const metadataBase = await resolveMetadataBaseFromHeaders();
  return buildSubmitShareMetadata(token, metadataBase);
}

export default function SubmitShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
