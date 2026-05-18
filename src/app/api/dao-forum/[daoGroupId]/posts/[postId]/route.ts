import { createClient } from "@/utils/supabase/server";
import type { Post } from "@app-types/posts"

export async function GET(_request: Request, { params }: { params: Promise<{ daoGroupId: string; postId: string }> }) {
    const { daoGroupId, postId } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("dao_group_id", daoGroupId)
        .eq("id", postId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            return Response.json({ error: "Post not found" }, { status: 404 });
        }
        return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data as Post);
}