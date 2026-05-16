import { createClient } from "@/utils/supabase/server";

export async function DELETE(request: Request, { params }: { params: { daoGroupId: string, postId: string } }) {
    const supabase = await createClient();

    // Check user is authenticated
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
        return Response.json(
            { error: "Invalid user" },
            { status: 401 }
        );
    }

    // Check post exists and belongs to user
    const { data: post, error: postError } = await supabase
        .from("posts")
        .select("id, author_id")
        .eq("id", params.postId)
        .eq("dao_group_id", params.daoGroupId)
        .single();

    if (postError || !post) {
        return Response.json(
            { error: "Post not found" },
            { status: 404 }
        );
    }

    // Check user is the author
    if (post.author_id !== user.id) {
        return Response.json(
            { error: "Unauthorized, you are not the author of this post" },
            { status: 403 }
        );
    }

    // Soft delete comments under the post
    const { error: commentsError } = await supabase
        .from("comments")
        .update({ 
            deleted_at: 'now()'
        })
        .eq("post_id", params.postId)

    if (commentsError) {
        return Response.json(
            { error: commentsError.message },
            { status: 500 }
        );
    }

    // Soft delete the post
    const { data, error } = await supabase
        .from("posts")
        .update({ 
            deleted_at: 'now()'
        })
        .eq("id", params.postId)
        .eq("dao_group_id", params.daoGroupId)
        .eq("author_id", user.id)
        .select()
        .single();

    if (error) {
        return Response.json(
            { error: error.message },
            { status: 500 }
        );
    }

    if (!data) {
        return Response.json(
            { error: "Post not found or unauthorized" },
            { status: 404 }
        );
    }

    return Response.json(data, { status: 200 });
}