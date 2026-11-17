export type SiteGuideEntry = {
  id: string;
  keywords: string[];
  title: string;
  path?: string;
  // IDs of verified pages that contain this feature or lead to it.
  relatedPageIds?: string[];
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
      "Enter Email Address, Course Code, Password, and Confirm Password, then select Register.",
      "Read the End User License Agreement, scroll to the bottom, and select I Accept to create the account.",
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
      "Course cards show learning progress; their main action is labelled Start Learning, Continue, or Review depending on progress.",
      "Select View Modules (the list icon) on a course card to open that course's learning panel.",
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
    relatedPageIds: ["course-portal", "your-daos", "class-daos", "dao-details"],
    access:
      "Signed-in users; assigned and optional modules depend on availability",
    steps: [
      "Open the Course Portal.",
      "Select Learning Modules (Learn on small screens) to browse modules across available courses, or select View Modules on a course card for that course.",
      "Choose a module and then a checkpoint to view its learning activity.",
    ],
    notes: [
      "Learning Modules opens a panel rather than a separate page. In the DAO section, the same button opens DAO learning modules.",
      "Modules may contain video or written checkpoints.",
      "The panel includes assigned course modules and available optional modules; progress belongs to the signed-in user.",
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
      "Select Open AI Tutor (the bot icon) in the bottom-right corner, or AI Tutor in the learning panel header when that panel is open.",
      "Enter a question in the chat and send it.",
    ],
    notes: [
      "The AI Tutor opens as a chat widget rather than on a separate page.",
      "It can answer learning questions and provide platform guidance.",
      "Use Close AI Tutor or Open fullscreen chat in the chat header. The learning panel's AI Tutor button can open fullscreen chat directly when space is limited.",
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
      "Open the AI Tutor, then select Open fullscreen chat in the header if it is in compact view.",
      "If the conversation list is hidden on a smaller screen, select Open conversations in the chat header.",
      "Use the conversation list to open an earlier conversation.",
      "Select Minimise chat to leave fullscreen view.",
    ],
    notes: [
      "Fullscreen chat shows the conversation list beside the chat on larger screens and in a collapsible Conversations panel on smaller screens.",
      "Conversation history belongs to the signed-in user.",
      "Fullscreen chat is a view of the widget rather than a separate page.",
      "Compact chat is hidden when an open learning panel leaves too little space; use AI Tutor in the panel header to reopen fullscreen chat.",
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
      "Open the AI Tutor in fullscreen view; select Open conversations if the conversation list is hidden.",
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
    title: "AI Tutor Response Actions and Saved Messages",
    access: "Signed-in users",
    steps: [
      "Open an AI Tutor conversation.",
      "Use Copy response on an AI Tutor reply to copy its text.",
      "Select Add response to favourites (the star below a reply) to save it.",
      "To find saved replies from compact chat, select Open fullscreen chat in the header.",
      "In fullscreen chat, select Open conversations if the conversation list is hidden.",
      "Clear any active conversation search with Clear search, then select View saved messages.",
      "Select a saved-message card to open its original conversation and scroll to the briefly highlighted reply.",
      "Select Remove from favourites (the star on a saved-message card), or Remove response from favourites below the original reply, to remove it from saved messages.",
      "Select Back in the saved-message list to return to the conversation list.",
    ],
    notes: [
      "Only AI Tutor replies saved to the conversation have a star control; a filled star means the reply is in saved messages.",
      "Replies can be starred or unstarred in both compact and fullscreen chat. The saved-message list is a fullscreen panel view, not a separate page or route.",
      "Removing a favourite keeps the original reply in its conversation.",
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
      "Select Ask a tutor beneath the latest AI Tutor reply in an existing conversation.",
      "Describe what you need help with and select Send request.",
    ],
    notes: [
      "Ask a tutor opens a request panel within compact or fullscreen chat.",
      "After sending a request, select Close on the confirmation panel. The latest reply shows Tutor request pending while the request has pending status.",
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
      "Find the Decentralized Governance course card and select Start Learning, Continue, or Review, depending on progress.",
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
      "This page shows DAOs associated with the user's class.",
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
    relatedPageIds: ["your-daos", "class-daos"],
    access: "Signed-in users who can access the selected DAO",
    steps: [
      "Open Your DAOs or Class DAOs.",
      "Select a DAO card.",
      "Use the Overview, Proposals, Members, or Forum tab to open the relevant area.",
    ],
    notes: [
      "The URL contains the selected DAO's identifier in place of {DAOID}; users should open it by selecting a DAO rather than typing the template path.",
      "Overview, Proposals, Members, and Forum are tabs within the selected DAO's page; they do not have separate routes.",
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
    relatedPageIds: ["dao-details", "your-daos", "class-daos"],
    access: "Signed-in members of a DAO with an available forum",
    steps: [
      "Open the Course Portal.",
      "Find the Decentralized Governance course card and select Start Learning, Continue, or Review, depending on progress.",
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
      "Comments can be sorted by Latest, Oldest, or Most reacted, and filtered by reaction type (or all reactions) with a minimum reaction count.",
      "Comments and replies can include an image attachment.",
    ],
  },
];
