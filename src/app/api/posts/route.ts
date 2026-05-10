import { createClient } from "@/utils/supabase/server";
import type { CreatePostFields } from "../../../../types/posts"

export async function GET() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json(data);
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const body = (await request.json()) as CreatePostFields;

    const { data, error } = await supabase.from("posts").insert(body).select().single();
    if (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json(data, { status: 201 });
}