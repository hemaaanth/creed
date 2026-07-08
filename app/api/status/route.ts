import { NextResponse } from "next/server";

const STATUS_URL = "https://status.creed.md";

type StatusColor = "green" | "yellow" | "red";

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function colorFromLabel(label: string): StatusColor {
  const normalized = label.toLowerCase();
  if (
    normalized.includes("operational") ||
    normalized.includes("resolved") ||
    normalized.includes("healthy")
  ) {
    return "green";
  }
  if (
    normalized.includes("outage") ||
    normalized.includes("down") ||
    normalized.includes("disruption")
  ) {
    return "red";
  }
  return "yellow";
}

function labelFromHtml(html: string) {
  const statusMatch = html.match(
    /role="status"[\s\S]*?<span[^>]*font-semibold[^>]*>([\s\S]*?)<\/span>/i,
  );
  return statusMatch ? stripTags(statusMatch[1]) : null;
}

export async function GET() {
  try {
    const response = await fetch(STATUS_URL, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { label: "Status unavailable", color: "yellow" satisfies StatusColor },
        { status: 200 },
      );
    }

    const html = await response.text();
    const label = labelFromHtml(html) ?? "Status unavailable";

    return NextResponse.json({
      label,
      color: colorFromLabel(label),
    });
  } catch {
    return NextResponse.json({
      label: "Status unavailable",
      color: "yellow" satisfies StatusColor,
    });
  }
}
