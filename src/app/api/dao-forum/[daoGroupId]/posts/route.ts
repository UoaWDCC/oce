import { createClient } from "@/utils/supabase/server";
import type { CreatePostFields } from "../../../../../../types/posts"

export async function GET(_request: Request, { params }: { params: Promise<{ daoGroupId: string }> }) {
    const daoGroupId = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, post_type_id, title, anonymous, is_pinned, created_at, deleted_at")
        .eq("dao_group_id", daoGroupId)
        .order("created_at", { ascending: false });
    if (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json(data);
}

export async function POST(request: Request, { params }: { params: Promise<{ daoGroupId: string }> }) {
    const daoGroupId = await params;
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

    const body = (await request.json()) as CreatePostFields;

    if (!body.title || !body.body || !body.post_type_id || !daoGroupId) {
        return Response.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    const { data: membership } = await supabase
        .from("dao_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("dao_group_id", daoGroupId)
        .single();

    if (!membership) {
        return Response.json(
            { error: "User is not a member of the specified DAO group" },
            { status: 403 }
        );
    }

    const { data, error } = await supabase
        .from("posts")
        .insert({ post_type_id: body.post_type_id, title: body.title, body: body.body, anonymous: body.anonymous, is_pinned: body.is_pinned, image_url: body.image_url, author_id: user.id, dao_group_id: daoGroupId })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return Response.json(
                { error: "Conflict with existing state" },
                { status: 409 }
            );
        };
        return Response.json(
            { error: error.message }, 
            { status: 500 }
        );
    };
    return Response.json(data, { status: 201 });
}