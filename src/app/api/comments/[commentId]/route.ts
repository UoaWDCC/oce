import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await context.params;
  const accessToken = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json()) as { body?: string; image_url?: string };
  const updates: { body?: string; image_url?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (json.body !== undefined) updates.body = json.body;
  if (json.image_url !== undefined) updates.image_url = json.image_url;

  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("id, author_id, deleted_at")
    .eq("id", commentId)
    .single();

  if (fetchError || !comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.deleted_at !== null) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("comments")
    .update(updates)
    .eq("id", commentId)
    .eq("author_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ comment: data });
}
