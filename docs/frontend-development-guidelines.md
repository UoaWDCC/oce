# Frontend Development Guidelines

This document explains the frontend structure, conventions, and workflow for the project.
Please read this before starting frontend development so that components, feature logic, API calls, and types are organised consistently across the codebase.

---

## 1. Frontend Architecture Overview

The frontend should follow this general structure:

```txt
Next.js route/page
↓
Feature container / hook
↓
API service layer
↓
Presentational components
↓
Shared TypeScript contracts
```

The goal is to keep UI components reusable, keep API logic in one place, and make it easier for multiple developers to work on the chatbot and chat-forum features without editing the same files unnecessarily.

---

## 2. Folder Structure

The frontend is organised using the following structure:

```txt
src/
  app/
    (with-navbar)/
      dao/
        [DAOID]/
          page.tsx
          governance.tsx
          proposals.tsx
          members.tsx

  components/
    common/

  features/
    chatbot/
      components/
      providers/
      hooks/
      api/
      types.ts
      mocks.ts
      index.ts

    chat-forum/
      components/
      hooks/
      api/
      types.ts
      mocks.ts
      index.ts

  types/
```

---

## 3. Folder Responsibilities

### `src/app`

This folder contains Next.js routes, layouts, and page-level composition.

Do not create permanent standalone routes such as `src/app/chatbot` or
`src/app/chat-forum` unless those features become standalone product pages.
In the current product model:

```txt
- The chatbot is embedded globally in the corner of the application.
- The chat-forum is embedded inside DAO pages.
```

Existing DAO routes should compose the relevant feature components.

Example:

```txt
src/app/(with-navbar)/layout.tsx
src/app/(with-navbar)/dao/[DAOID]/page.tsx
src/app/(with-navbar)/dao/[DAOID]/governance.tsx
src/app/(with-navbar)/dao/[DAOID]/proposals.tsx
```

Page files should stay relatively simple. They should compose feature-level
components and pass route-specific data such as `daoId`.

Example:

```tsx
import { ForumPanel } from "@/features/chat-forum";

export default function DaoPage() {
  return (
    <>
      {/* existing DAO page UI */}
      <ForumPanel daoId={daoId} />
    </>
  );
}
```

Avoid putting large amounts of state, API logic, or UI logic directly inside `page.tsx`.

---

### `src/components/common`

This folder contains reusable UI components that can be used across multiple features.

Examples:

```txt
Button
Card
Modal
Avatar
LoadingSpinner
EmptyState
ErrorMessage
Input
TextArea
```

Components in this folder should be generic and should not know anything about the chatbot or chat-forum features.

Good example:

```tsx
<Button variant="primary">Submit</Button>
```

Bad example:

```tsx
<Button variant="likePost">Like Post</Button>
```

If the component is specific to the forum or chatbot, place it in the relevant
feature folder instead.

---

### `src/features`

This folder contains feature-specific logic.

Each feature should have its own folder:

```txt
src/features/chatbot/
src/features/chat-forum/
```

Use this folder for:

```txt
- Feature-specific presentational components
- Container components
- Feature-specific hooks
- Feature-specific API wrappers
- Mock data
- Feature-specific helper functions
- Feature-specific types, if they are not shared globally
```

Examples:

```txt
src/features/chatbot/components/ChatInput.tsx
src/features/chatbot/components/ChatMessage.tsx
src/features/chatbot/providers/ChatBoxModalProvider.tsx
src/features/chatbot/api/sendMessage.ts
src/features/chatbot/types.ts

src/features/chat-forum/components/ForumPanel.tsx
src/features/chat-forum/components/PostCard.tsx
src/features/chat-forum/api/posts.ts
src/features/chat-forum/api/comments.ts
src/features/chat-forum/types.ts
```

---

### `src/types`

This folder contains shared TypeScript contracts.

Examples:

```txt
src/types/user.ts
src/types/chatbot.ts
src/types/forum.ts
src/types/api.ts
```

These types should match the backend API responses as closely as possible.

If the backend API changes, update these types as part of the same work.

---

## 4. Presentational Components vs Container Components

We use a separation between presentational components and container components.

---

### Presentational Components

Presentational components are responsible for rendering UI.

They should:

```txt
- Receive data through props
- Render UI
- Trigger callbacks passed in through props
- Be easy to preview in the local development preview routes
- Be reusable where possible
```

They should not:

```txt
- Call fetch directly
- Call Supabase directly
- Know about API routes
- Handle complex business logic
- Contain feature-level state management
```

Example:

```tsx
type PostCardProps = {
  title: string;
  content: string;
  authorName: string;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
  onLike: () => void;
  onOpen: () => void;
};

export function PostCard({
  title,
  content,
  authorName,
  likeCount,
  commentCount,
  hasLiked,
  onLike,
  onOpen,
}: PostCardProps) {
  return (
    <article>
      <h3>{title}</h3>
      <p>{content}</p>
      <p>Posted by {authorName}</p>

      <button onClick={onLike}>
        {hasLiked ? "Liked" : "Like"} ({likeCount})
      </button>

      <button onClick={onOpen}>Comments ({commentCount})</button>
    </article>
  );
}
```

---

### Container Components

Container components are responsible for logic.

They can:

```txt
- Fetch data
- Use hooks
- Manage loading states
- Manage error states
- Handle API calls
- Handle Supabase subscriptions
- Pass clean props into presentational components
```

Example:

```tsx
"use client";

import { PostCard } from "@/features/chat-forum/components/PostCard";
import { usePost } from "../hooks/usePost";

type PostCardContainerProps = {
  postId: string;
};

export function PostCardContainer({ postId }: PostCardContainerProps) {
  const { post, isLoading, error, likePost, openPost } = usePost(postId);

  if (isLoading) {
    return <p>Loading post...</p>;
  }

  if (error) {
    return <p>Failed to load post.</p>;
  }

  if (!post) {
    return <p>Post not found.</p>;
  }

  return (
    <PostCard
      title={post.title}
      content={post.content}
      authorName={post.authorName}
      likeCount={post.likeCount}
      commentCount={post.commentCount}
      hasLiked={post.hasLiked}
      onLike={likePost}
      onOpen={openPost}
    />
  );
}
```

---

## 5. Next.js Client and Server Component Rules

By default, components in the Next.js App Router are server components.

Only use `"use client"` when the component needs browser-side interactivity.

Use `"use client"` when using:

```txt
- useState
- useEffect
- onClick handlers
- Form input state
- Browser APIs
- Client-side hooks
```

Example:

```tsx
"use client";

export function ChatInput() {
  // useState and event handlers require this to be a client component
}
```

Do not add `"use client"` unnecessarily to every file. Keep server components as server components where possible.

---

## 6. Development Preview Pages

Use internal development-only preview routes inside the Next.js app for chatbot
and chat-forum UI development.
These routes provide a lightweight place to view feature components with mock
data while keeping the development workflow close to the real application.

Current preview routes:

```txt
http://localhost:3000/dev/chatbot
http://localhost:3000/dev/chat-forum
```

Route files:

```txt
src/app/dev/chatbot/page.tsx
src/app/dev/chatbot/ChatbotPreviewClient.tsx

src/app/dev/chat-forum/page.tsx
src/app/dev/chat-forum/ChatForumPreviewClient.tsx
```

These pages must stay development-only. Each `/dev/.../page.tsx` should guard
against production access:

```tsx
import { notFound } from "next/navigation";

export default function DevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <FeaturePreviewClient />;
}
```

Use preview pages for:

```txt
- Viewing presentational components with mock data
- Checking loading, empty, error, and populated states
- Reviewing component layout inside the app's real CSS environment
- Capturing screenshots or short videos for PR review
```

Avoid adding unrelated legacy components to these routes. The preview pages are
for new chatbot and chat-forum development only.

---

### Preview Page Workflow

When adding or changing a visual component:

```txt
1. Build the component inside the relevant feature folder.
2. Add realistic mock data to the feature's mocks.ts file if needed.
3. Add or update the relevant /dev preview section.
4. Run the app locally with npm run dev.
5. Visit the preview route and check the main UI states.
6. Attach a screenshot or short screen recording to the PR.
```

Example preview section:

```tsx
import { mockChatMessages } from "@/features/chatbot/mocks";
import ChatMessage from "@/features/chatbot/components/chatMessage";
import ChatReply from "@/features/chatbot/components/chatReply";

export function MessagePreview() {
  return (
    <section>
      <h2>Messages</h2>
      <ChatMessage>{mockChatMessages[0].message}</ChatMessage>
      <ChatReply>{mockChatMessages[1].message}</ChatReply>
    </section>
  );
}
```

For chat-forum, placeholders may live in the preview route until real feature
components exist. Once a real component is added, replace the placeholder preview
with the actual component.

---

## 7. TypeScript Contracts

Shared API response types should be placed in `src/types`.

Example:

```ts
export type UserSummary = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type ForumPost = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
  createdAt: string;
};

export type ForumComment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type ChatbotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};
```

Important rule:

```txt
Frontend types should match backend API responses.
```

If the UI needs a different format, create a mapper function instead of changing the API response type.

Example:

```ts
export function mapForumPostToPostCardProps(post: ForumPost) {
  return {
    title: post.title,
    content: post.content,
    authorName: post.authorName,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    hasLiked: post.hasLiked,
  };
}
```

---

## 8. API Service Layer

Do not call `fetch()` directly inside presentational components.

Instead, place feature-specific API calls inside the feature's `api/` folder.
Use `src/lib/api` only for generic request helpers shared across features.

Example structure:

```txt
features/
  chat-forum/
    api/
      posts.ts
      comments.ts

  chatbot/
    api/
      sendMessage.ts
```

Example:

```ts
import { ForumPost } from "@/features/chat-forum/types";

export async function getPosts(): Promise<ForumPost[]> {
  const res = await fetch("/api/posts");

  if (!res.ok) {
    throw new Error("Failed to fetch posts");
  }

  return res.json();
}

export async function likePost(postId: string): Promise<void> {
  const res = await fetch(`/api/posts/${postId}/like`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to like post");
  }
}
```

Then use the service inside a hook or container:

```tsx
"use client";

import { useEffect, useState } from "react";
import { getPosts } from "../api/posts";
import { ForumPost } from "@/features/chat-forum/types";

export function usePosts() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadPosts() {
      try {
        const data = await getPosts();
        setPosts(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    }

    loadPosts();
  }, []);

  return {
    posts,
    isLoading,
    error,
  };
}
```

---

## 9. Mock Data

Mock data can be used to build UI before API integration is complete.

Place mock data inside the relevant feature folder.

Example:

```txt
features/chat-forum/mocks.ts
features/chatbot/mocks.ts
```

Example:

```ts
import { ForumPost } from "@/features/chat-forum/types";

export const mockPosts: ForumPost[] = [
  {
    id: "post-1",
    title: "How does staking work?",
    content: "I am confused about how staking rewards are calculated.",
    authorId: "user-1",
    authorName: "Eddie",
    likeCount: 5,
    commentCount: 3,
    hasLiked: false,
    createdAt: "2026-05-29T10:00:00Z",
  },
];
```

Mock data should be realistic and match the shared TypeScript contracts.

---

## 10. Chat-Forum Development Guidelines

The chat-forum feature should generally follow this pattern:

```txt
Posts:
- Created, updated, deleted, and fetched through normal HTTP API calls

Comments:
- Initially loaded through an HTTP API call
- Updated on page reload through HTTP API call
```

For post detail pages, the expected flow is:

```txt
1. Load post details
2. Load existing comments
3. Allow the user to submit a new comment
4. Update the UI when new comments are loaded upon page refresh
```

---

## 11. Chatbot Development Guidelines

The chatbot feature should generally follow this pattern:

```txt
1. User enters a message
2. UI adds the user message to the chat
3. Frontend sends the message to the chatbot API
4. UI shows a loading or typing state
5. API returns the assistant response
6. UI adds the assistant response to the chat
7. UI handles errors clearly if the request fails
```

The chatbot presentational components should not know how the AI API works. They should only receive messages, loading states, and callback props.

Mount the chatbot from a shared layout so it can appear across the application:

```tsx
import { ChatButton, ChatModalProvider, ChatSection } from "@/features/chatbot";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ChatModalProvider>
      {children}
      <ChatSection />
      <div className="fixed bottom-3 right-3">
        <ChatButton />
      </div>
    </ChatModalProvider>
  );
}
```

---

## 12. Loading, Error, and Empty States

Every feature page should handle:

```txt
- Loading state
- Error state
- Empty state
- Success state
```

Examples:

```txt
Forum post list:
- Loading: "Loading posts..."
- Error: "Failed to load posts."
- Empty: "No posts yet."
- Success: Show list of posts.

Post comments:
- Loading: "Loading comments..."
- Error: "Failed to load comments."
- Empty: "No comments yet."
- Success: Show comment list.

Chatbot:
- Loading: Typing indicator
- Error: "Something went wrong. Please try again."
- Empty: Suggested starter prompts
- Success: Show conversation
```

Do not mark a page as complete if these states are missing.

---

## 13. Naming Conventions

Use clear and consistent naming.

### Components

```txt
PascalCase
```

Examples:

```txt
PostCard.tsx
CommentItem.tsx
ChatInput.tsx
MessageBubble.tsx
```

### Hooks

```txt
camelCase, starting with use
```

Examples:

```txt
usePosts.ts
useComments.ts
useChatbot.ts
```

### API Files

```txt
camelCase or resource-based names
```

Examples:

```txt
posts.ts
comments.ts
sendMessage.ts
```

### Types

```txt
PascalCase for type names
```

Examples:

```ts
ForumPost;
ForumComment;
ChatbotMessage;
UserSummary;
```

---

## 14. Pull Request Expectations

Keep PRs small and focused.

A good PR should do one main thing.

Good examples:

```txt
Build PostCard component
Add ChatInput to the /dev/chatbot preview page
Create chatbot API service
Connect post list page to API
Add comment subscription hook
```

Avoid large PRs like:

```txt
Build entire forum frontend
Build whole embedded chatbot
Massive frontend update
```

---

### PR Checklist

Before requesting review, check:

```txt
- Does the PR link to a GitHub issue?
- Is the PR focused on one feature/change?
- Are visual chatbot or chat-forum components added to the relevant /dev preview page?
- Are loading, error, and empty states handled?
- Are TypeScript types updated if API data changed?
- Are API calls placed in service files or hooks?
- Are presentational components kept free of API logic?
- Are screenshots or short screen recordings included for UI changes?
- Does the app run locally?
- Does the relevant /dev preview page load locally?
```

---

## 15. Branch Naming

Use clear branch names.

Examples:

```txt
feature/forum-post-card
feature/forum-post-list
feature/forum-comment-input
feature/forum-like-button
feature/chatbot-message-bubble
feature/chatbot-input
feature/chatbot-api-service
fix/forum-like-state
fix/chatbot-error-state
```

---

## 16. Key Rule Summary

Follow these rules when in doubt:

```txt
- Pages should stay simple.
- Presentational components should only render UI.
- Container components and hooks should handle logic.
- API calls should go through service files.
- Shared types should match backend API responses.
- Use /dev preview pages for chatbot and chat-forum UI review.
- Keep PRs small and easy to review.
```

The main goal is to make the frontend easier to build, review, and maintain while multiple people are working on the chatbot and chat-forum features at the same time.
