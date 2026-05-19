import { createClient, supabaseAdmin } from "@/utils/supabase/server";


export async function DELETE(request:Request , { params }: { params: Promise<{ commentId: string }> }) {
    const { commentId } = await params;

    // Get access token from Authorization header
    const accessToken = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
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
            { status: 401 }
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
            { status: 404 }
        );
    }

    // Check if user is the author
    const isAuthor = comment.author_id === user.id;

    // Check if user is a shaman in the DAO that owns this comment's post
    let isShaman = false;

    // Get the post to find the DAO group it belongs to
    const { data: post } = await supabaseAdmin
        .from("posts")
        .select("dao_group_id")
        .eq("id", comment.post_id)
        .single();

    if (post?.dao_group_id) {
        // Get the DAO group to find associated blockchain DAO
        const { data: daoGroup } = await supabaseAdmin
            .from("dao_groups")
            .select("id, name")
            .eq("id", post.dao_group_id)
            .single();

        if (daoGroup) {
            // Find the blockchain DAO - try matching by dao_id (uuid as text) or name
            const { data: dao } = await supabaseAdmin
                .from("dao")
                .select("members")
                .or(`dao_id.eq.${daoGroup.id},name.ilike.${daoGroup.name}`)
                .single();

            if (dao?.members?.shamans) {
                // Get user's wallet addresses
                const { data: student } = await supabaseAdmin
                    .from("student")
                    .select("wallet")
                    .eq("uid", user.id)
                    .single();

                if (student?.wallet) {
                    const userWallets = student.wallet.map(
                        (w: { walletAddress: string }) => w.walletAddress.toLowerCase()
                    );

                    // Check if user's wallet is in the shaman list
                    isShaman = dao.members.shamans.some((shaman: { address: string }) =>
                        userWallets.includes(shaman.address.toLowerCase())
                    );
                }
            }
        }
    }

    const canDelete = isAuthor || isShaman;

    if (canDelete) {
        const { error: updateError } = await supabase
            .from("comments")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", commentId);

        if (updateError) {
            return Response.json(
                { error: "Failed to delete comment" },
                { status: 500 }
            );
        }

        return Response.json({ success: true });
    }

    return Response.json({ error: "Forbidden" }, { status: 403 });

    
}