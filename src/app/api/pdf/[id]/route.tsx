import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { TimelinePdf } from "@/lib/pdf/TimelinePdf";

/** GET /api/pdf/[id] — stream a PDF for a purchased timeline */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Verify purchase before serving the PDF
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("timeline_id", id)
    .eq("user_id", user.id)
    .single();

  if (!purchase) {
    return NextResponse.json({ error: "Purchase required" }, { status: 403 });
  }

  const { data: timeline } = await supabase
    .from("timelines")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!timeline) {
    return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
  }

  try {
    const buffer = await renderToBuffer(<TimelinePdf timeline={timeline} />);
    const filename = `clearpaws-timeline-${timeline.pet_breed.replace(/\s+/g, "-").toLowerCase()}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[pdf] Render failed:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
