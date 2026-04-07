import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const { serverId } = await params;
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "DB Connect Fail" }, { status: 500 });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Verify Ownership
  const { data: server, error: serverError } = await supabase
    .from("servers")
    .select("owner_id")
    .eq("id", serverId)
    .single();

  if (serverError || !server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  if (server.owner_id !== user.id) {
    return NextResponse.json({ error: "Admin rights required" }, { status: 403 });
  }

  // 2. Cascade Delete
  // All channels, members, messages will be deleted via database foreign key cascading.
  const { error: deleteError } = await supabase
    .from("servers")
    .delete()
    .eq("id", serverId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
