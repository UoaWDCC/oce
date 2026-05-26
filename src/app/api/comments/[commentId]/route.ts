import { createClient } from "@/utils/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function DELETE(request:Request , { params }: { params: Promise<{ commentId: string }> }) {
    const { commentId } = await params;

    // Get access token from Authorization header
    const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders }
        );
    }

    const supabase = await createClient(accessToken);

    // Check user is authenticated
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders }
        );
    }
    const { data: comment, error: fetchError } = await supabase
    .from('comments')
    .select("*")
    .eq('id', commentId)
    .single();

    if (fetchError || !comment|| comment.deleted_at != null) {
        return Response.json(
            { message: "Comment does not exist" },
            { status: 404, headers: corsHeaders }
        );
    }

    // Check if user is the author
    if (comment.author_id !== user.id) {
        return Response.json(
            { error: "Forbidden" },
            { status: 403, headers: corsHeaders }
        );
    }

    // User is the author, proceed with soft delete
    {
        const { error: updateError } = await supabase
            .from("comments")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", commentId);

        if (updateError) {
            return Response.json(
                { error: "Failed to delete comment" },
                { status: 500, headers: corsHeaders }
            );
        }

        return Response.json({ success: true }, { headers: corsHeaders });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: corsHeaders,
    });
}