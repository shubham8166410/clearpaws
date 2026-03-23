import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import {
  DAFF_MONITORED_PAGES,
  fetchPageContent,
  hashContent,
} from "@/lib/daff-monitor";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/cron/daff-scrape
 * Called weekly by Vercel Cron (Sunday 11pm UTC = Monday 9am AEST).
 * Scrapes DAFF pages, detects content changes, and emails admin if changes found.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient() as unknown as SupabaseClient;
  const errors: string[] = [];
  const changedUrls: string[] = [];
  let pagesChecked = 0;

  for (const url of DAFF_MONITORED_PAGES) {
    try {
      const content = await fetchPageContent(url);

      if (content === null) {
        errors.push(`Failed to fetch: ${url}`);
        continue;
      }

      const contentHash = await hashContent(content);
      pagesChecked++;

      // Fetch most recent snapshot for this URL
      const { data: latestSnapshot, error: selectError } = await supabase
        .from("daff_snapshots")
        .select("content_hash")
        .eq("page_url", url)
        .order("scraped_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) {
        errors.push(`DB read error for ${url}: ${selectError.message}`);
        continue;
      }

      const changesDetected =
        latestSnapshot !== null && latestSnapshot.content_hash !== contentHash;

      if (changesDetected) {
        changedUrls.push(url);
      }

      // Insert new snapshot row
      const { error: insertError } = await supabase
        .from("daff_snapshots")
        .insert({
          page_url: url,
          content_hash: contentHash,
          raw_content: content,
          scraped_at: new Date().toISOString(),
          changes_detected: changesDetected,
        });

      if (insertError) {
        errors.push(`DB insert error for ${url}: ${insertError.message}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Unexpected error for ${url}: ${message}`);
    }
  }

  // Send admin email if any changes were detected
  if (changedUrls.length > 0) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "petborder.com";

    if (adminEmail) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: `PetBorder <noreply@${baseDomain}>`,
          to: adminEmail,
          subject: "PetBorder DAFF Alert — Rule Change Detected",
          text: [
            "One or more DAFF pages have changed.",
            "",
            "Changed pages:",
            ...changedUrls.map((u) => `- ${u}`),
            "",
            `Review at: https://${baseDomain}/admin/daff-monitor`,
            "",
            "PetBorder continues using the previous verified rules until you mark the change as reviewed.",
          ].join("\n"),
        });
      } catch (emailErr) {
        const message =
          emailErr instanceof Error ? emailErr.message : String(emailErr);
        errors.push(`Email send failed: ${message}`);
      }
    } else {
      errors.push("ADMIN_EMAIL not set — skipped alert email");
    }
  }

  return NextResponse.json({
    checked: pagesChecked,
    changesDetected: changedUrls.length,
    errors,
  });
}
