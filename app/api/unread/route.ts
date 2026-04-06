import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase configuration is missing" }, { status: 500 });
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const receipts = payload.receipts as Record<string, string> | undefined;

    if (!receipts || typeof receipts !== "object") {
      return NextResponse.json({ unreadCounts: {} });
    }

    const unreadCounts: Record<string, number> = {};

    // For simplicity, we loop through up to 20 channels. 
    // In a massive app, you'd do a complex GROUP BY query, but this works perfectly for ~5-15 channels.
    const channelIds = Object.keys(receipts).slice(0, 30);

    await Promise.all(
      channelIds.map(async (channelId) => {
        const lastRead = receipts[channelId];
        if (!lastRead) return;

        const { count, error } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("channel_id", channelId)
          .gt("created_at", lastRead);

        if (!error && count !== null && count > 0) {
          unreadCounts[channelId] = count;
        }
      })
    );

    return NextResponse.json({ unreadCounts });
  } catch (error: any) {
    console.error("Unread error:", error);
    return NextResponse.json({ error: "Failed to load unread counts" }, { status: 500 });
  }
}
