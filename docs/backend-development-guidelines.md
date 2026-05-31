# Backend Development Guidelines

This document explains the backend API structure, conventions, and workflow for the project.
Please read this before starting backend development so that API routes, authentication, validation, database access, and response contracts stay consistent across the chatbot and chat-forum features.

---

## 1. Backend Architecture Overview

The backend should follow this general structure:

```txt
Next.js API route
↓
Authentication / authorization helper
↓
Request validation
↓
Supabase query or mutation
↓
Response formatting
↓
Shared TypeScript contract / OpenAPI contract
```

The goal is to keep API routes predictable, keep auth and membership checks consistent, and make it easier for frontend developers to consume chatbot and chat-forum endpoints without guessing response shapes.

---

## 2. Folder Structure

The backend is organised using Next.js App Router route handlers:

```txt
src/
  app/
    api/
      ai-tutor/
        conversations/
          route.ts

      dao-forum/
        [daoGroupId]/
          posts/
            route.ts
            [postId]/
              route.ts
              comments/
                route.ts

      comments/
        [commentId]/
          route.ts

  utils/
    authHelper.ts
    daoMembership.ts
    supabase/
      server.ts
      client.ts

types/
  posts.ts
  comments.ts

docs/
  openapi.yaml
```

---

## 3. Folder Responsibilities

### `src/app/api`

This folder contains API route handlers.

Route handlers should:

```txt
- Parse path parameters and query parameters
- Authenticate the request
- Authorise the user for the requested resource
- Validate request bodies
- Call Supabase
- Return JSON responses with the correct status code
```

Route handlers should not:

```txt
- Duplicate auth parsing logic
- Put reusable business rules inline if they are shared across routes
- Return inconsistent response shapes for the same resource
- Leak service role credentials or server-only secrets
```

---

### `src/utils/authHelper.ts`

Use this for shared authentication logic.

For bearer-token API routes, prefer:

```ts
import { authenticateUser } from "@/utils/authHelper";

const auth = await authenticateUser(request, corsHeaders);
if (auth.response) return auth.response;

const { supabase, user } = auth;
```

This gives the route:

```txt
- A user-scoped Supabase client
- The authenticated Supabase user
- A standard 401 response for missing or invalid tokens
```

Do not manually parse and validate bearer tokens in every route unless the route has a clear reason to use a different auth flow.

---

### `src/utils/daoMembership.ts`

Use this for DAO membership checks.

```ts
import { checkDAOMembership } from "@/utils/daoMembership";

const isDaoMember = await checkDAOMembership(supabase, user.id, daoGroupId);

if (!isDaoMember) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 403, headers: corsHeaders },
  );
}
```

Use DAO membership checks for forum actions that should only be available to members of the DAO group.

---

### `types`

Backend contracts currently live in the root `types/` folder.

Examples:

```txt
types/posts.ts
types/comments.ts
```

These contracts should match the database fields and API response shapes as closely as possible.
If a route formats database data before returning it, add a separate formatted response type.

Example:

```ts
export interface RawComment {
  id: string;
  body: string | null;
  deleted_at: string | null;
}

export interface FormattedComment {
  id: string;
  body: string | null;
}
```

---

### `docs/openapi.yaml`

Keep the OpenAPI document aligned with backend route changes.

When adding, removing, or changing an API endpoint, update:

```txt
- Path
- Method
- Auth requirements
- Request body schema
- Query parameters
- Success response schema
- Error response statuses
```

---

## 4. Response Conventions

Return JSON from all API routes.

For errors, use:

```ts
return NextResponse.json(
  { error: "Human-readable error message" },
  { status: 400, headers: corsHeaders },
);
```

Use these status codes consistently:

```txt
200 OK
- Successful read, update, or soft delete

201 Created
- Successful create

400 Bad Request
- Missing fields
- Invalid JSON
- Invalid sort option
- Invalid parent comment
- Empty comment body

401 Unauthorized
- Missing or invalid bearer token

403 Forbidden
- Authenticated user lacks permission
- Authenticated user is not a DAO member
- Authenticated user is not the author

404 Not Found
- Post or comment does not exist
- Post or comment has been soft-deleted

409 Conflict
- Unique constraint conflict or existing-state conflict

500 Internal Server Error
- Unexpected database or server failure
```

Prefer stable response shapes for frontend consumers.

Examples:

```txt
GET /api/ai-tutor/conversations
→ { conversation }

POST /api/ai-tutor/conversations
→ { conversation }

POST /api/dao-forum/[daoGroupId]/posts/[postId]/comments
→ { success: true, comment }

PATCH /api/comments/[commentId]
→ { comment }

DELETE /api/comments/[commentId]
→ { comment }
```

If changing a response shape, update frontend types, API wrappers, and `docs/openapi.yaml` in the same PR.

---

## 5. Supabase Query Rules

Use the authenticated user-scoped Supabase client for user actions.

```ts
const auth = await authenticateUser(request, corsHeaders);
if (auth.response) return auth.response;

const { supabase, user } = auth;
```

Use server-only admin/service-role clients only when a route genuinely needs privileged access.

Query rules:

```txt
- Scope DAO forum post queries by dao_group_id
- Scope post detail queries by both dao_group_id and post id
- Check author_id before allowing post or comment edits
- Check deleted_at before returning or modifying soft-deleted records
- Prefer maybeSingle() when a missing row is expected and should become 404
- Prefer single() when the write should return exactly one row
```

---

## 6. CORS and OPTIONS

Most existing routes define `corsHeaders` and an `OPTIONS` handler.

Use the same pattern when adding similar API routes:

```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
```

Make sure `Access-Control-Allow-Methods` matches the actual methods supported by the route.

---

## 7. Testing and Verification

At minimum, backend PRs should verify:

```txt
- TypeScript passes
- Auth failures return 401
- Permission failures return 403
- Missing resources return 404
- Invalid input returns 400
- Successful creates return 201
- Successful updates/deletes return 200
```

Useful commands:

```bash
npx tsc --noEmit
npm run build
```

When automated API tests are added, keep them focused on the route contract:

```txt
- Request method
- Auth requirement
- Request body validation
- Permission checks
- Success response shape
- Error response shape
```

---

### Postman Testing with OpenAPI

Use `docs/openapi.yaml` as the source of truth for manual API testing in Postman.

Postman can import the OpenAPI file and automatically generate a collection of
application endpoints. This gives the team a shared set of requests without
manually recreating every route.

Recommended setup:

```txt
1. Open Postman.
2. Import docs/openapi.yaml.
3. Let Postman generate a collection from the OpenAPI paths.
4. Create a local environment for the app.
5. Store reusable values as environment variables.
6. Use the generated requests to verify endpoint behavior.
```

Recommended environment variables:

```txt
baseUrl=http://localhost:3000
accessToken=<supabase-access-token>
daoGroupId=<dao-group-id>
postId=<post-id>
commentId=<comment-id>
```

Use variables in request URLs and headers:

```txt
{{baseUrl}}/api/dao-forum/{{daoGroupId}}/posts
Authorization: Bearer {{accessToken}}
```

For dynamic route parameters generated from OpenAPI, update the generated
request URL to use Postman environment variables where helpful.

Example:

```txt
Generated:
/api/dao-forum/{daoGroupId}/posts/{postId}/comments

Local Postman request:
{{baseUrl}}/api/dao-forum/{{daoGroupId}}/posts/{{postId}}/comments
```

Use Postman to verify the same contract cases expected in backend PRs:

```txt
- Missing token returns 401
- Invalid token returns 401
- Non-member access returns 403 where DAO membership is required
- Non-author mutation returns 403
- Missing or invalid fields return 400
- Missing or deleted resources return 404
- Successful creates return 201
- Successful reads, updates, and soft deletes return 200
```

When an endpoint changes, update `docs/openapi.yaml` first or in the same PR,
then re-import or refresh the Postman collection so the generated requests match
the current API contract.

---

## 8. Pull Request Expectations

Keep backend PRs small and focused.

Good examples:

```txt
Add create-comment API validation
Add active conversation endpoint
Add post soft-delete behavior
Add comment sorting support
Update forum response types
```

Avoid large PRs like:

```txt
Build entire forum backend
Build all chatbot APIs
Rewrite auth and forum endpoints together
```

---

### PR Checklist

Before requesting review, check:

```txt
- Does the PR link to a GitHub issue?
- Is the PR focused on one API feature/change?
- Are route handlers using shared auth helpers?
- Are DAO membership checks included where needed?
- Are author-only mutations protected?
- Are request bodies validated before database writes?
- Are soft-delete rules preserved?
- Are response shapes stable and documented?
- Are TypeScript contracts updated if API data changed?
- Is docs/openapi.yaml updated for route contract changes?
- Does npx tsc --noEmit pass?
- Does the relevant frontend API wrapper or preview page still work?
```

---

## 9. Key Rule Summary

Follow these rules when in doubt:

```txt
- API routes should authenticate first.
- Authorization must happen before writes.
- Validate request bodies before Supabase mutations.
- Use shared helpers for auth and DAO membership.
- Keep response shapes stable.
- Use soft deletes for posts and comments.
- Update TypeScript contracts and OpenAPI docs with API changes.
- Keep backend PRs small and easy to review.
```

The main goal is to make backend APIs predictable, secure, and easy for the frontend team to consume while multiple people are working on the chatbot and chat-forum features at the same time.
