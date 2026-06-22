import type { Metadata } from "next";
import { PrivacyPageView } from "@/components/marketing/privacy-page-view";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Creed collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyPageView />;
}
