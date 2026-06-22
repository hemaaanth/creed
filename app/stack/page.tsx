import type { Metadata } from "next";
import { StackPageView } from "@/components/marketing/stack-page-view";

export const metadata: Metadata = {
  title: "Stack",
  description: "The technology Creed uses to run, store, and process your data.",
  alternates: { canonical: "/stack" },
};

export default function StackPage() {
  return <StackPageView />;
}
