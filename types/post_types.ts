export const POST_TYPE = {
  Announcement: "Announcement",
  Proposal: "Proposal",
  Question: "Question",
  Discussion: "Discussion",
  Resource: "Resource",
} as const;

export type PostType = (typeof POST_TYPE)[keyof typeof POST_TYPE];