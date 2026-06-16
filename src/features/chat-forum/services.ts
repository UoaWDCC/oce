async function request(path: string, options: RequestInit={}, token?: string) {
    const res = await fetch(`/api${path}`, {...options});
    if (!res.ok) {
        throw new Error(`Forum request failed: ${res.status} ${res.statusText}`);
    }
 
    return res.status === 204 ? null : res.json();
}

export async function getForumPosts(daoGroupId: string) {
    const data = await request(`/dao-forum/${daoGroupId}/posts`, {});
    return data;
}
export async function createForumPosts(daoGroupId: string, postData: any) {
    const data = await request(
        `/dao-forum/${daoGroupId}/posts`, 
        { method: "POST", body: JSON.stringify(postData) }
    );
    return data;
}
export async function createPostComment(daoGroupId: string, postId: string, commentData: any) {
    const data = await request(
        `/dao-forum/${daoGroupId}/posts/${postId}/comments`,
        { method: "POST", body: JSON.stringify(commentData) },
    );
    return data;
}
 
export async function updateForumComment(commentId: string, commentdData: any) {
    const data = await request(
        `/comments/${commentId}`,
        { method: "PATCH", body: JSON.stringify(commentData) },
    );
    return data;
}
 
export async function deleteForumComment(commentId: string) {
    await request(`
        /comments/${commentId}`, 
        { method: "DELETE" },
    );
    return { success: true };
}
