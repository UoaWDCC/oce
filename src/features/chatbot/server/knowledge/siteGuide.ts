export type SiteGuideEntry = {
  id: string;
  keywords: string[];
  title: string;
  path?: string;
  access?: string;
  steps: string[];
  notes?: string[];
};

export const SITE_GUIDE: SiteGuideEntry[] = [
  {
    id: "login",
    keywords: ["login", "log in", "sign in", "account"],
    title: "Login",
    path: "/login",
    access: "Public",
    steps: [
      "Open the Login page.",
      "Enter your email address and password, then select Sign In.",
    ],
    notes: ["Students are taken to the Course Portal after signing in."],
  },
  {
    id: "register",
    keywords: ["register", "sign up", "create account", "course code"],
    title: "Register",
    path: "/register",
    access: "Approved users who have a valid course code",
    steps: [
      "Open the Login page.",
      "Select Sign up.",
      "Enter your email address, course code, and password.",
      "Review and accept the End User Licence Agreement to create the account.",
    ],
    notes: [
      "Registration is limited to users approved for the supplied course code.",
    ],
  },
  {
    id: "end-user-licence-agreement",
    keywords: ["eula", "licence", "license", "terms", "agreement"],
    title: "End User Licence Agreement",
    path: "/end-user-licence-agreement",
    access: "Public",
    steps: ["Open the End User Licence Agreement page."],
    notes: [
      "The agreement is also shown during registration and must be accepted before an account is created.",
    ],
  },

  {
    id: "course-portal",
    keywords: [
      "courses",
      "course portal",
      "learning",
      "modules",
      "progress",
      "checkpoints",
    ],
    title: "Course Portal",
    path: "/portal",
    access: "Signed-in users",
    steps: [
      "Sign in as a student to open the Course Portal automatically.",
      "From another course area, select the OnChain Education logo to return to the Course Portal.",
    ],
    notes: [
      "The Course Portal shows the user's required and optional courses.",
      "Each course card shows learning progress and has a Start Learning action.",
      "Select the module-list action on a course card to view that course's modules.",
      "The page also summarises total, completed, and in-progress checkpoints.",
    ],
  },
  {
    id: "learning-modules",
    keywords: [
      "learning modules",
      "module",
      "checkpoint",
      "lesson",
      "course content",
    ],
    title: "Learning Modules",
    access: "Signed-in users enrolled in the relevant course",
    steps: [
      "Open the Course Portal.",
      "Select Learning Modules to browse modules across the available courses, or use the module action on a course card.",
      "Choose a module and then a checkpoint to view its learning activity.",
    ],
    notes: [
      "Learning Modules opens inside the Course Portal rather than on a separate page.",
      "Modules may contain video or written checkpoints.",
      "Available modules and progress depend on the signed-in user's courses.",
    ],
  },

  {
    id: "ai-tutor",
    keywords: [
      "ai tutor",
      "chat",
      "chatbot",
      "learning assistant",
      "ask a question",
    ],
    title: "AI Tutor",
    access: "Signed-in users",
    steps: [
      "Select the AI Tutor button in the bottom-right corner of the platform.",
      "Enter a question in the chat and send it.",
    ],
    notes: [
      "The AI Tutor opens as a chat widget rather than on a separate page.",
      "It can answer learning questions and provide platform guidance.",
      "The chat can be closed or expanded using the controls in its header.",
    ],
  },
  {
    id: "ai-tutor-fullscreen",
    keywords: [
      "fullscreen chat",
      "expand chat",
      "minimise chat",
      "conversation list",
      "chat history",
    ],
    title: "AI Tutor Fullscreen and Conversation History",
    access: "Signed-in users",
    steps: [
      "Open the AI Tutor from the bottom-right corner.",
      "Select Open fullscreen chat in the chat header.",
      "Use the conversation list to open an earlier conversation.",
      "Select Minimise chat to return to the smaller chat widget.",
    ],
    notes: [
      "The fullscreen view shows the conversation list beside the current chat.",
      "Conversation history belongs to the signed-in user.",
      "Fullscreen chat is a view of the widget rather than a separate page.",
    ],
  },
  {
    id: "ai-tutor-conversation-management",
    keywords: [
      "new conversation",
      "search conversations",
      "conversation title",
      "previous conversation",
      "end conversation",
      "remove conversation",
    ],
    title: "Manage AI Tutor Conversations",
    access: "Signed-in users",
    steps: [
      "Open the AI Tutor in fullscreen view.",
      "Select New Conversation to start a separate chat.",
      "Use Search conversations title to find an existing conversation by its title.",
      "Select a conversation from the list to open its messages.",
      "Use End conversation and confirm the dialog to remove a conversation from the sidebar.",
    ],
    notes: [
      "Ending a conversation removes it from the conversation sidebar.",
      "Conversation search matches conversation titles.",
    ],
  },
  {
    id: "ai-tutor-response-actions",
    keywords: [
      "copy response",
      "copy answer",
      "favourite",
      "favorite",
      "saved message",
      "bookmarked answer",
      "starred message",
    ],
    title: "AI Tutor Response Actions and Favourites",
    access: "Signed-in users",
    steps: [
      "Open an AI Tutor conversation.",
      "Use Copy response on an AI Tutor reply to copy its text.",
      "Use Add response to favourites to mark a saved AI Tutor reply with a star.",
      "Use Remove response from favourites to remove the star later.",
    ],
    notes: [
      "Only saved AI Tutor responses display the favourite control.",
      "Reopen the original conversation to find a favourited response; a filled star indicates that it is saved as a favourite.",
    ],
  },
  {
    id: "ask-a-tutor",
    keywords: [
      "ask a tutor",
      "human tutor",
      "real tutor",
      "tutor request",
      "more help",
    ],
    title: "Ask a Tutor",
    access: "Signed-in users with an active AI Tutor conversation",
    steps: [
      "Open an AI Tutor conversation.",
      "Find Ask a tutor beneath the latest saved AI Tutor response.",
      "Describe what you need help with and select Send request.",
    ],
    notes: [
      "Ask a tutor appears only on the latest AI Tutor reply in a saved conversation.",
      "After a request is sent, the conversation shows Tutor request pending while it remains open.",
      "A real tutor will follow up on the conversation.",
    ],
  },

  {
    id: "your-daos",
    keywords: ["dao", "daos", "your daos", "governance"],
    title: "Your DAOs",
    path: "/dao",
    access: "Signed-in registered users",
    steps: [
      "Open the Course Portal.",
      "Find the Decentralized Governance course card and select Start Learning.",
    ],
    notes: [
      "This page shows DAOs available to the signed-in user.",
      "Select a DAO card to open that DAO's details.",
    ],
  },
  {
    id: "class-daos",
    keywords: ["class dao", "class daos", "browse daos"],
    title: "Class DAOs",
    path: "/dao/class-daos",
    access: "Signed-in registered users",
    steps: [
      "Open the Decentralized Governance section.",
      "Select Class DAOs from the section navigation.",
    ],
    notes: [
      "This page shows DAOs created throughout the user's class.",
      "Select a DAO card to open that DAO's details.",
    ],
  },
  {
    id: "dao-details",
    keywords: [
      "dao details",
      "overview",
      "proposals",
      "members",
      "forum",
      "vote",
    ],
    title: "DAO Details",
    path: "/dao/{DAOID}",
    access: "Signed-in users who can access the selected DAO",
    steps: [
      "Open Your DAOs or Class DAOs.",
      "Select a DAO card.",
      "Use the Overview, Proposals, Members, or Forum tab to open the relevant area.",
    ],
    notes: [
      "The URL contains the selected DAO's identifier in place of {DAOID}; users should open it by selecting a DAO rather than typing the template path.",
      "The Overview area shows governance information.",
      "The Proposals area allows users to view proposals and, when permitted, participate in governance.",
      "The Members area shows DAO membership information.",
      "The Forum area contains discussion for the selected DAO when a forum group is available.",
    ],
  },
  {
    id: "dao-forum",
    keywords: [
      "dao forum",
      "forum",
      "community",
      "post",
      "comment",
      "reply",
      "discussion",
      "announcement",
      "resource",
    ],
    title: "DAO Forum",
    access: "Signed-in members of a DAO with an available forum",
    steps: [
      "Open the Course Portal.",
      "Find the Decentralized Governance course card and select Start Learning.",
      "Open Your DAOs or Class DAOs and select a DAO card.",
      "Select the Forum tab in DAO Details.",
    ],
    notes: [
      "The Forum belongs to the selected DAO and opens inside DAO Details rather than on a separate page.",
      "Users can browse posts, search by post title or content, and show unread posts only.",
      "Posts can be filtered by Announcement, Proposal, Question, Discussion, or Resource.",
      "Pinned posts appear separately from other forum posts.",
      "Users can create a New Post with a title, post type, content, and an optional image attachment.",
      "A post can be published anonymously.",
      "Select a post to read its full thread, view its comments, and see its view and reply counts.",
      "Users can add comments, reply to comments, and like or unlike comments.",
      "Comments can be sorted by Latest, Oldest, or Most liked.",
      "Comments and replies can include an image attachment.",
    ],
  },
];
