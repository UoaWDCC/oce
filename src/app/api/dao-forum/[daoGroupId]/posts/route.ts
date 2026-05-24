import { createClient } from "@/utils/supabase/server";
import type { CreatePostFields } from "../../../../../../types/posts"
import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ daoGroupId: string }> }) {
    const { daoGroupId } = await params;

    const accessToken = _request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders },
        );
    }

    const supabase = await createClient(accessToken);

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json(
            { error: "Invalid auth token" },
            { status: 401, headers: corsHeaders },
        );
    }

    const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, post_type_id, title, anonymous, is_pinned, created_at, deleted_at")
        .eq("dao_group_id", daoGroupId)
        .order("created_at", { ascending: false });
    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500, headers: corsHeaders }
        );
    }
    return NextResponse.json(data, { headers: corsHeaders });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ daoGroupId: string }> }) {
    const { daoGroupId } = await params;

    const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders },
        );
    }

    const supabase = await createClient(accessToken);

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json(
            { error: "Invalid auth token" },
            { status: 401, headers: corsHeaders },
        );
    }

    const body = (await request.json()) as CreatePostFields;

    if (!body.title || !body.body || !body.post_type_id || !daoGroupId) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400, headers: corsHeaders }
        );
    }

    const { data: membership } = await supabase
        .from("dao_members")
        .select("user_id, dao_group_id")
        .eq("user_id", user.id)
        .eq("dao_group_id", daoGroupId)
        .single();

    if (!membership) {
        return NextResponse.json(
            { error: "User is not a member of the specified DAO group" },
            { status: 403, headers: corsHeaders }
        );
    }

    const { data, error } = await supabase
        .from("posts")
        .insert({ post_type_id: body.post_type_id, title: body.title, body: body.body, anonymous: body.anonymous, is_pinned: body.is_pinned, image_url: body.image_url, author_id: user.id, dao_group_id: daoGroupId })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json(
                { error: "Conflict with existing state" },
                { status: 409, headers: corsHeaders }
            );
        };
        return NextResponse.json(
            { error: error.message },
            { status: 500, headers: corsHeaders }
        );
    };
    return NextResponse.json(data, { status: 201, headers: corsHeaders });
}
