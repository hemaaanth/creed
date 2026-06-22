import type { Metadata } from "next";
import { TermsPageView } from "@/components/marketing/terms-page-view";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "The rules that govern your use of Creed.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <TermsPageView />;
}
