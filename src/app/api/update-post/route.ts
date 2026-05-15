import { createClient } from "@/utils/supabase/server";
import type { UpdatePostFields } from "../../../../types/posts"

export async function PATCH(request: Request, { params }: { params: { daoGroupId: string, postId: string } }) {
    const supabase = await createClient();

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

    const body = (await request.json()) as UpdatePostFields;

    if (!body.title || !body.body || !body.post_type_id || body.anonymous === undefined || body.is_pinned === undefined) {
        return Response.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from("posts")
        .update({ 
            post_type_id: body.post_type_id, 
            title: body.title, 
            body: body.body, 
            anonymous: body.anonymous, 
            is_pinned: body.is_pinned, 
            image_url: body.image_url,
            updated_at: 'now()'
        })
        .eq("id", params.postId)
        .eq("author_id", user.id)  // ensure user can only update their own posts
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