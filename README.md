# OnChain Education

OnChain Education is a web application for practical blockchain learning, with course content, DAO governance, an AI Tutor and DAO discussion forums.

This repository includes the AI Tutor and DAO Chat Forum developed by the University of Auckland Web, Design & Coding Club (WDCC).

## Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [AI Configuration](#ai-configuration)
- [Development and Testing](#development-and-testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Documentation and Contributing](#documentation-and-contributing)

## Features

### AI Tutor

- Compact and fullscreen chat accessible throughout the application.
- Streamed AI responses with persisted conversation history.
- Multiple conversations with automatically generated titles.
- Conversation title search and incremental message loading.
- Response copying and favourites with navigation to saved answers.
- Current-page context and platform navigation guidance.
- Educational system instructions for concept explanations and assessment-related questions.
- Configurable usage allowance with warning and limit states.
- Student tutor requests linked to conversations.

### DAO Chat Forum

- A dedicated forum within each linked DAO.
- Posts, comments and nested replies.
- Author-only editing and deletion of your own posts/comments.
- Shaman deletion of posts within their DAO, including anonymous posts.
- A newest-first feed with post categories, search and unread filtering.
- ENS or wallet-based author labels and optional anonymous posts.
- Formatted content and image attachments.
- Four comment reaction types, sorting, and reaction/minimum-count filters saved in the URL.
- Single-choice and multiple-choice polls.
- Unique-viewer counts and read tracking.
- Local post drafts and cached data fetching.

## Tech Stack

| Area              | Technology                                           |
| ----------------- | ---------------------------------------------------- |
| Application       | Next.js 15, React 19, TypeScript                     |
| Styling           | Tailwind CSS                                         |
| UI components     | Lucide, Radix UI                                     |
| Authentication    | Supabase Auth                                        |
| Database          | Supabase PostgreSQL                                  |
| Image storage     | Supabase Storage                                     |
| Forum queries     | TanStack React Query                                 |
| AI provider       | Google GenAI SDK through a shared provider interface |
| Content rendering | React Markdown and forum HTML sanitisation           |
| Testing           | Vitest, Testing Library, jsdom                       |
| Deployment        | OpenNext and Cloudflare Workers                      |

Dependency versions are defined in `package.json` and `package-lock.json`.

## Getting Started

### Prerequisites

- Git.
- Node.js and npm compatible with the project dependencies.
- A Supabase project with the required application schema.
- An approved application account.
- An API key with access to the configured AI model.

The repository does not currently pin a Node.js version.

The included database migrations extend an existing schema. They do not initialise the complete application database from scratch.

### Installation

```bash
git clone https://github.com/UoaWDCC/oce.git
cd oce
npm ci
```

Create `.env.local` in the repository root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
LLM_PROVIDER=google

# Optional
MAX_DAILY_TOKENS=100000
NEXT_PUBLIC_API_URL=/api
```

Replace the placeholders with values for your environment, then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable                         | Required     | Description                                             |
| -------------------------------- | ------------ | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Yes          | Supabase project URL                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Yes          | Public anonymous key for the same Supabase project      |
| `NEXT_SUPABASE_SERVICE_ROLE_KEY` | Yes          | Server-side service role key                            |
| `GOOGLE_API_KEY`                 | For Gemini   | Server-side Google AI API key                           |
| `LLM_PROVIDER`                   | For AI Tutor | Provider selection; currently supports `google`         |
| `MAX_DAILY_TOKENS`               | No           | Positive integer; defaults to `100000`                  |
| `NEXT_PUBLIC_API_URL`            | No           | API base used by existing consumers; defaults to `/api` |

Keep service role and AI API keys server-side. Never prefix private credentials with `NEXT_PUBLIC_` or commit their values.

`.env` and `.env.local` are ignored by Git. Restart the development server after changing environment variables.

The AI Tutor and forum API clients use relative `/api/...` paths. `NEXT_PUBLIC_API_URL` does not override every API request in the application.

### Database Setup

The main feature dependencies are:

| Area                 | Tables                                                  |
| -------------------- | ------------------------------------------------------- |
| Application identity | `AllowedUsers`, `Student`                               |
| DAO information      | `DAO`, `dao_groups`, `dao_members`                      |
| AI Tutor             | `conversations`, `messages`, `tutor_requests`           |
| Forum content        | `posts`, `comments`, `tags`, `post_tags`                |
| Forum activity       | `post_views`, `comment_reactions`                       |
| Forum polls          | `forum_polls`, `forum_poll_options`, `forum_poll_votes` |

Other application flows require additional tables. For example, registration also uses `StudentActivity` and `user_eula_acceptances`.

For a new database, prepare the complete base schema, foreign keys, functions, grants and Row Level Security (RLS) policies before applying the included migrations. Several API queries depend on named foreign-key relationships.

For an existing database, inspect its current state and apply only missing migrations.

| Migration                                                       | Purpose                                    |
| --------------------------------------------------------------- | ------------------------------------------ |
| `20260714000000_link_dao_groups_to_dao.sql`                     | Links forum groups to DAOs                 |
| `20260802000000_create_forum_images_bucket.sql`                 | Configures forum image storage             |
| `20260804000000_add_post_views.sql`                             | Adds view tracking                         |
| `20260820000000_add_forum_polls.sql`                            | Adds poll tables and functions             |
| `20260903000000_add_message_favourited_at.sql`                  | Adds favourite timestamps                  |
| `20260913055540_convert_comment_likes_to_comment_reactions.sql` | Converts existing likes to typed reactions |

Migration files are located in [`supabase/migrations`](supabase/migrations).

Review each file before execution:

- The DAO mapping migration includes a manual mapping stage for existing groups.
- The reaction migration expects the earlier `comment_likes` table.
- Migrations are not all safe to rerun.
- `supabase/presentation_forum_seed.sql` contains demonstration data and is not required for application setup.

The forum also requires these database functions:

- `record_post_view`
- `create_forum_post_with_poll`
- `get_forum_poll`
- `submit_forum_poll_vote`

### Accounts and DAO Membership

An Auth account alone does not provide every application record or permission.

The registration flow uses approved entries in `AllowedUsers` and links them to student records. Forum access uses membership records in `dao_members`.

Each forum group links to an existing DAO through `dao_groups.dao_id`. Creating a group does not automatically populate all member records.

### Image Storage

The `forum-images` bucket supports JPEG, PNG, GIF and WebP files up to 5 MB.

Uploads use folders containing the uploader's user ID. The supplied bucket configuration allows public reads, so uploaded image URLs are not restricted by DAO membership and can identify the uploader. Anonymous post responses hide the author ID, but this does not make attached images anonymous or private.

### Accessing the Features

- **AI Tutor:** sign in and select the AI Tutor launcher.
- **DAO Forum:** select a DAO and open its **Forum** tab.

Development preview pages are available at `/dev/chatbot` and `/dev/chat-forum`. These routes return 404 in production.

## Project Structure

| Path                                  | Purpose                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `src/app/`                            | Application pages, layouts and API routes                    |
| `src/app/api/ai-tutor/`               | AI chat, conversations, favourites, usage and tutor requests |
| `src/app/api/dao-forum/`              | Forum posts, comments and polls                              |
| `src/app/api/comments/`               | Comment actions and reactions                                |
| `src/features/chatbot/`               | AI Tutor components, hooks, state and API clients            |
| `src/features/chatbot/server/`        | Tutor instructions, page knowledge and context selection     |
| `src/features/chat-forum/`            | Forum queries, mutations, mapping and thread views           |
| `src/features/tutorRequest/`          | Student tutor-request interface                              |
| `src/features/chat-forum/components/` | Forum UI and composers                                       |
| `src/llm/`                            | AI provider interface, factory and implementations           |
| `src/utils/supabase/`                 | Supabase browser and server clients                          |
| `src/utils/authHelper.ts`             | Authentication and role helpers                              |
| `src/lib/queryClient.tsx`             | React Query configuration                                    |
| `supabase/migrations/`                | Incremental database changes                                 |
| `__tests__/`                          | API, component and behaviour tests                           |
| `docs/`                               | Development guides and API documentation                     |

Additional tests are colocated within feature directories.

## Architecture

### AI Tutor

The chat flow separates message persistence from AI generation:

1. Create a conversation if required.
2. Save the user message through `POST /api/ai-tutor/chat`.
3. Schedule title generation for an untitled conversation.
4. Send conversation history and optional page context to `POST /api/ai-tutor/chat/stream`.
5. Validate authentication, conversation ownership and usage.
6. Construct the system instruction and select relevant context.
7. Stream the provider response.
8. Persist the completed assistant message.

The streaming endpoint receives conversation history from the client. It does not load the complete history from the database for each request.

Because the question is saved first, a failed generation request can leave a question without a completed answer. Partial responses from failed or cancelled generation are not stored as completed assistant messages.

#### Streaming

The API returns `text/event-stream` with:

| Event payload       | Meaning                           |
| ------------------- | --------------------------------- |
| JSON-encoded string | Incremental response text         |
| `[MESSAGE_ID]...`   | Persisted assistant message ID    |
| `[DONE]`            | Successful completion             |
| `[ERROR]...`        | Generation or persistence failure |

The client parser is implemented in `src/features/chatbot/api/conversations.ts`.

#### History and Favourites

Conversation listing supports title search and pagination. It returns the newest updated conversations first.

- Default conversation page size: 20.
- Default message page size: 15.
- Maximum requested page size: 100.
- Message pagination starts with the newest page and loads backwards.
- Each message page is returned in chronological order.

Ending a conversation changes its status to `ended`; it does not permanently delete the conversation.

Favourites store assistant replies. Selecting a saved reply opens its original conversation and locates the message.

#### Context and Instructions

The tutor combines:

- Core instructions from `server/prompts/aiTutorSystemPrompt.ts`.
- Verified guidance from `server/knowledge/siteGuide.ts`.
- Resolved page context.
- Selected recent conversation history.

Page context describes supported page types. It does not expose the selected tab, checkpoint text or actual page content. DAO-specific paths are normalised to `/dao/{DAOID}`.

Navigation selection includes up to three relevant guide entries. History selection targets approximately 3,200 estimated tokens, excluding the system instruction. Older content may be omitted or excerpted; an oversized latest turn is retained unchanged.

Learning boundaries are prompt-based. They guide model behaviour but do not provide deterministic assessment enforcement.

#### Usage Allowance

The application estimates usage from saved message characters divided by four over the preceding 24 hours.

- Default allowance: `100000`.
- Configuration: `MAX_DAILY_TOKENS`.
- Warning threshold: 80%.
- Capacity returns gradually as messages leave the rolling window.

This estimate is separate from actual provider billing. It does not fully account for repeated prompt history, system instructions or title generation.

#### Tutor Requests

Tutor requests store a student's question against a conversation and expose its pending status.

The current implementation does not include a tutor inbox, notification delivery or tutor reply workflow.

### DAO Forum

The DAO page resolves a forum group UUID and passes it to the forum module. Authenticated APIs load and modify posts, comments and polls.

React Query manages cached results and refreshes after mutations. Cache keys include relevant group, thread, sort and user context. Reaction updates are optimistic and reconciled with the server.

The forum currently uses request-based loading rather than live subscriptions. See [forum setup and acceptance](docs/dao-forum-database.md) and the [cleanup record/deferred work](docs/dao-forum-cleanup.md) for current structure, database prerequisites, and verification limits.

#### Content and Activity

- Post types: `Announcement`, `Proposal`, `Question`, `Discussion`, `Resource`.
- Search matches loaded post titles and content.
- Comments use `parent_comment_id` for threaded replies.
- Editing remains author-only. Posts may also be deleted by a shaman of that DAO, including anonymous posts. Comment deletion remains author-only.
- Soft deletion uses `deleted_at`; normal single-post reads and edits exclude deleted posts.
- Deleted parent comments may retain placeholders where replies remain.
- Author labels prefer ENS names, falling back to wallet addresses.
- Post text/poll drafts are stored locally per user and DAO. Selected image files are not restored after reload.

Reactions support `heart`, `thumbs_up`, `fire` and `thumbs_down`.

Comment sorts are `latest`, `oldest` and `most_reacted`. The latter uses the combined count of all reaction types. Reply filters support reaction type and minimum count, retain necessary ancestors, and persist the view in the URL.

Polls support single or multiple selections. Updating a vote replaces the user's previous selections. Existing poll questions/options cannot be edited. Forum polls are stored in Supabase and are separate from on-chain governance proposals.

View tracking records one entry per user and post. New comments after the user's last view make the post unread again.

#### Content Limits

| Content              | Limit          |
| -------------------- | -------------- |
| Post title           | 50 characters  |
| Visible post body    | 350 characters |
| Visible comment body | 350 characters |
| Image attachment     | 5 MB           |
| Poll question        | 200 characters |
| Poll option          | 80 characters  |
| Poll options         | 2–6            |

### Authentication and Authorisation

Feature API clients send a Supabase access token:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The shared helpers have different responsibilities:

- `authenticateUser` validates a token and returns a user-scoped Supabase client.
- `authenticateRequest` additionally resolves application role information from `AllowedUsers`.

AI routes verify conversation ownership. Forum operations combine author checks, relevant DAO membership checks and database access policies.

Some queries depend on configured RLS policies. Preserve these policies when reproducing the database or changing server-side clients.

Shaman status is resolved from `dao_groups.dao_id`, `DAO.Members.shamans` and the authenticated user's `Student.Wallet` addresses. The post list exposes `can_delete` separately from ownership so moderation does not reveal an anonymous author. Verify live policies permit shaman soft deletion within the correct DAO without permitting edits to another author's content; mocked tests do not verify database permissions.

## AI Configuration

### Gemini Models

The current provider is selected with:

```dotenv
LLM_PROVIDER=google
```

The model is configured in `src/llm/providers/GeminiProvider.ts`:

```ts
const MODEL_ID = "gemini-2.5-flash-lite";
```

Model availability depends on the API account. Verify access to the configured model before running the AI Tutor. See [issue #203](https://github.com/UoaWDCC/oce/issues/203) for a reported compatibility issue.

To change the model:

1. Replace `MODEL_ID` with a supported model ID.
2. Configure the corresponding `GOOGLE_API_KEY`.
3. Review supported generation settings and model metadata.
4. Restart the development server or rebuild and redeploy.

The model constant is used for both title generation and streamed chat. There is currently no model environment-variable override.

### Other Providers

Only Gemini is currently implemented. Another provider can be added through the shared interface in `src/llm/interfaces/LLMProvider.ts`:

```ts
interface LLMProvider {
  getModelInfo(): ModelInfo;
  complete(messages: Message[], config: LLMConfig): Promise<string>;
  stream(messages: Message[], config: LLMConfig): AsyncIterable<string>;
  tokenUsage(): TokenUsage;
}
```

To add a provider:

1. Create an implementation under `src/llm/providers/`.
2. Map message roles, history, system instructions and generation settings.
3. Support complete title generation and incremental text streaming.
4. Return model information and provider token usage.
5. Register the implementation in `src/llm/LLMProviderFactory.ts`.
6. Configure server-side credentials and the matching `LLM_PROVIDER` value.

Changing the environment variable alone does not add provider support.

Test title generation, streaming, context handling, persistence and error behaviour after changing models or providers. Review the provider's limits and the difference between its billing and the application's estimated allowance.

## Development and Testing

### Commands

| Command                 | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Start the development server            |
| `npm run build`         | Build the Next.js application           |
| `npm start`             | Start the built Next.js application     |
| `npm test`              | Run Vitest in watch mode                |
| `npm test -- --run`     | Run tests once                          |
| `npm run lint:prettier` | Check formatting                        |
| `npm run format`        | Apply formatting                        |
| `npm run preview`       | Build and preview the Cloudflare Worker |
| `npm run deploy`        | Build and deploy through Wrangler       |

Example focused tests:

```bash
npm test -- --run __tests__/gemini-provider.test.ts __tests__/ai-tutor-system-instruction.test.ts

npm test -- --run __tests__/posts.test.ts __tests__/comments.test.ts __tests__/forum-polls.test.ts
```

Vitest uses jsdom, with `@` mapped to `src/` and `@app-types` mapped to `types/`.

Tests cover API behaviour, streaming, context selection, pagination, sessions, favourites and forum interactions. Mocked tests do not verify live database policies or external model availability.

The existing `lint:eslint` script invokes `next lint`; it may require adjustment for the installed Next.js CLI. Legacy worker/oracle scripts reference a `scripts/` directory absent from this repository and are not required for these features.

### Manual Checks

Use a prepared development database and separate test accounts.

**AI Tutor**

- Send a question and verify streamed output and a generated title.
- Reload and reopen the conversation.
- Search conversations and load older messages.
- Save an answer and reopen it through favourites.
- Submit a tutor request.
- Check navigation guidance and assessment-related behaviour.
- Verify usage warning and limit states.

**DAO Forum**

- Create a post, comment and nested reply.
- Edit and delete your own content.
- Verify another account cannot modify it.
- As a shaman, delete another author's regular and anonymous posts in your DAO; verify you cannot edit them or moderate another DAO's posts.
- Add/remove reactions and combine sort, reaction type and minimum-count filters. Check nested replies, deleted ancestors, empty results, URL refresh and back/forward.
- Create a poll, vote and update the selection.
- Upload an image.
- Check search, unread state and view counts.
- Verify access with accounts from different DAOs.

For handover, record the tested commit SHA, environment/URL, date, account roles, flows covered and results. Record any untested cases separately; a successful UI journey does not establish direct Supabase access-policy or image-privacy guarantees. See [forum setup and acceptance](docs/dao-forum-database.md) for the full checklist and [deferred work](docs/dao-forum-cleanup.md) for outstanding items.

## Deployment

The repository targets Cloudflare Workers through OpenNext.

Configuration is defined in:

- `wrangler.jsonc`
- `open-next.config.ts`
- The Next.js configuration files.

The application requires a server runtime for API routes and streamed AI responses.

### Configure the Target Environment

1. Set the Worker name and routes in `wrangler.jsonc` for your deployment.
2. Configure bindings required by the selected OpenNext cache adapter.
3. Supply public build-time variables and private runtime variables or secrets.
4. Add the exact application origin to `allowedOrigins` in `src/middleware.ts`.
5. Configure Supabase authentication URLs for the deployment.
6. Verify database migrations, access policies, image storage and AI model access.

The default middleware origin allowlist is configured for local development. The supplied Wrangler configuration references an existing custom domain; update it for your target environment before deploying.

### Preview and Deploy

Authenticate with the intended Cloudflare account:

```bash
npx wrangler login
```

Build and preview:

```bash
npm run preview
```

Deploy to the configured target:

```bash
npm run deploy
```

A local `.env.local` file does not automatically configure production secrets.

After deployment, verify authentication, streaming, persistence, forum operations and access restrictions using the deployed origin.

## Troubleshooting

| Symptom                                | Checks                                                                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| AI returns 502 or “LLM provider error” | API key, model availability, provider logs and issue #203                                                        |
| Question saved without an answer       | Inspect the separate streaming request and provider response                                                     |
| Conversation remains untitled          | Check background title generation and database updates                                                           |
| API returns 401                        | Session, Bearer token and Supabase configuration                                                                 |
| AI streaming rejects a valid Auth user | Confirm the account has an `AllowedUsers` entry                                                                  |
| DAO has no forum                       | Check `dao_groups.dao_id` and the resolved group UUID                                                            |
| Forum access is denied                 | Membership records, RLS and grants                                                                               |
| Edit or delete is denied               | Editing is author-only; post deletion also allows that DAO's shamans. Check wallet mapping and database policies |
| Missing database relationship          | Verify the base schema and named foreign keys                                                                    |
| Poll or view recording fails           | Check database functions, migrations and grants                                                                  |
| Image upload fails                     | Check the bucket, upload policy, MIME type and file size                                                         |
| API returns 429                        | Distinguish AI allowance, middleware and provider rate limits                                                    |
| Deployed requests fail an origin check | Update `allowedOrigins` for the exact origin                                                                     |

### Current Behaviour and Limitations

- AI page context identifies page types rather than reading checkpoint content.
- Learning guardrails rely on model behaviour.
- Tutor requests do not include a staff response interface.
- Course-level AI enable/disable controls are not implemented.
- Forum changes are loaded through requests rather than live subscriptions.
- Forum post lists are not paginated; search filters loaded posts.
- Post drafts are browser-local and do not synchronise between devices.
- Anonymous post responses do not guarantee anonymous/private images or direct database access.
- Complete DAO membership synchronization and database-policy verification depend on OCE's existing integration.
- Existing poll questions/options cannot be edited; users can change their votes.
- Usage allowance is an estimate rather than a billing measurement.

## Documentation and Contributing

- [Frontend development guidelines](docs/frontend-development-guidelines.md)
- [Backend development guidelines](docs/backend-development-guidelines.md)
- [OpenAPI reference](docs/openapi.yaml)
- [Issues](https://github.com/UoaWDCC/oce/issues)
- [Pull requests](https://github.com/UoaWDCC/oce/pulls)

The OpenAPI document provides additional API reference, but route implementations are the source of truth where documentation differs.
