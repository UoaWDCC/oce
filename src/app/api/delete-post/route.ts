import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

export async function DELETE(request: Request, { params }: { params: Promise<{ daoGroupId: string, postId: string }> }) {

    const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");
    const supabase = await createClient(accessToken);
    const {daoGroupId, postId} = await params;

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json(
            { error: "Invalid user" },
            { status: 401, headers: corsHeaders }
        );
    }

    const { data: post, error: postError } = await supabase
        .from("posts")
        .select("id, author_id")
        .eq("id", postId)
        .eq("dao_group_id", daoGroupId)
        .single();

    if (postError || !post) {
        return NextResponse.json(
            { error: "Post not found" },
            { status: 404, headers: corsHeaders }
        );
    }

    if (post.author_id !== user.id) {
        return NextResponse.json(
            { error: "Unauthorized, you are not the author of this post" },
            { status: 403, headers: corsHeaders }
        );
    }

    const { error: commentsError } = await supabase
        .from("comments")
        .update({ deleted_at: 'now()' })
        .eq("post_id", postId)

    if (commentsError) {
        return NextResponse.json(
            { error: commentsError.message },
            { status: 500, headers: corsHeaders }
        );
    }

    const { data, error } = await supabase
        .from("posts")
        .update({ deleted_at: 'now()' })
        .eq("id", postId)
        .eq("dao_group_id", daoGroupId)
        .eq("author_id", user.id)
        .select()
        .single();

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500, headers: corsHeaders }
        );
    }

    if (!data) {
        return NextResponse.json(
            { error: "Post not found or unauthorized" },
            { status: 404, headers: corsHeaders }
        );
    }

    return NextResponse.json(data, { status: 200, headers: corsHeaders });
}