import { ChatMessageType } from "./types";

export const mockChatMessages: ChatMessageType[] = [
  {
    type: "user",
    message: "test",
  },
  {
    type: "bot",
    message: `# Weekly Update

Completed tasks:
- Finished homepage redesign
- Updated mobile navigation
- Fixed login bug

Next steps:
- User testing on Tuesday
- Accessibility review on Thursday

Notes:
The new layout improves readability
and creates clearer visual hierarchy.`,
  },
];
