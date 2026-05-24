import { createClient } from "@/utils/supabase/server";
import type { Post, UpdatePostFields } from "@app-types/posts"
import { NextResponse } from "next/server";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PATCH",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(_request: Request, { params }: { params: Promise<{ daoGroupId: string; postId: string }> }) {
    const { daoGroupId, postId } = await params;
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
        .select("*")
        .eq("dao_group_id", daoGroupId)
        .eq("id", postId)
        .maybeSingle();

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500, headers: corsHeaders },
        );
    }

    if (!data) {
        return NextResponse.json(
            { error: "Post not found" },
            { status: 404, headers: corsHeaders },
        );
    }

    return NextResponse.json(data as Post, { headers: corsHeaders });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ daoGroupId: string, postId: string }> }) {
    const { daoGroupId, postId } = await params;

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

    const body = (await request.json()) as UpdatePostFields;

    if (!body.title || !body.body || !body.post_type_id || body.anonymous === undefined || body.is_pinned === undefined) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400, headers: corsHeaders }
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
            image_url: body.image_url
        })
        .eq("dao_group_id", daoGroupId)
        .eq("id", postId)
        .select()
        .maybeSingle();

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
