import { describe, expect, it } from "vitest";
import {
  selectConversationMessages,
  selectNavigationEntries,
} from "@/features/chatbot/server/context/selectTutorContext";
import { SITE_GUIDE } from "@/features/chatbot/server/knowledge/siteGuide";
import { buildAiTutorInstruction } from "@/features/chatbot/server/prompts/buildAiTutorInstruction";
import { AI_TUTOR_SYSTEM_PROMPT } from "@/features/chatbot/server/prompts/aiTutorSystemPrompt";
import { estimateTokenUsage } from "@/utils/aiTutorTokenUsage";
import type { Message } from "@/llm/types/Message";

function user(content: string): Message {
  return { role: "user", content };
}

function assistant(content: string): Message {
  return { role: "assistant", content };
}

describe("selectNavigationEntries", () => {
  it.each([
    "What is a smart contract?",
    "Explain DAO governance.",
    "Can you explain token staking?",
    "What does learning mean?",
    "Can you give me more help with blockchain?",
    "Why is copy protection useful?",
    "Explain the difference between a question and a reply.",
  ])("keeps a learning question free of navigation: %s", (question) => {
    expect(selectNavigationEntries(question)).toEqual([]);
    expect(selectNavigationEntries(question, { path: "/portal" })).toEqual([]);
  });

  it.each([
    ["How can I ask a human tutor for more help?", "ask-a-tutor"],
    ["Can I copy an AI Tutor response?", "ai-tutor-response-actions"],
  ])("selects actual platform support guidance: %s", (question, id) => {
    expect(selectNavigationEntries(question)).toContainEqual(
      SITE_GUIDE.find((entry) => entry.id === id),
    );
  });

  it("selects navigation entries matching the question", () => {
    expect(
      selectNavigationEntries("Where do I vote on a proposal?").map(
        (entry) => entry.id,
      ),
    ).toEqual(["dao-details"]);
  });

  it.each([undefined, {}, { title: "Unknown page" }])(
    "does not award an absent path bonus: %j",
    (context) => {
      expect(
        selectNavigationEntries("How do I use this page?", context),
      ).toEqual([]);
      expect(
        selectNavigationEntries(
          "Where do I sign in, open chat history, and ask a tutor?",
          context,
        ).map((entry) => entry.id),
      ).toEqual(["login", "ai-tutor-fullscreen", "ask-a-tutor"]);
    },
  );

  it("does not boost pathless entries when a page path is present", () => {
    expect(
      selectNavigationEntries("How do I use this page?", {
        path: "/portal",
        title: "Course Portal",
      }),
    ).toEqual([SITE_GUIDE.find((entry) => entry.id === "course-portal")]);
  });

  it("uses only the genuinely matching page path", () => {
    expect(
      selectNavigationEntries("Where is that?", {
        path: "/dao/{DAOID}",
        title: "DAO Details",
      }),
    ).toEqual([SITE_GUIDE.find((entry) => entry.id === "dao-details")]);
  });
});

describe("selectConversationMessages", () => {
  it("retains the assessed task and guidance through a low-keyword follow-up", () => {
    const messages = [
      user(
        "My assessed checkpoint asks for three advantages of decentralisation.",
      ),
      assistant("Start by thinking about resistance to outages."),
      user("What is an outage?"),
      assistant("An outage is a period when a service is unavailable."),
      user("Okay, explain the next point."),
    ];
    expect(selectConversationMessages(messages)).toEqual(messages);
  });

  it("keeps earlier corrections and explicit preferences with ample budget", () => {
    const messages = [
      user(
        "Please answer in Spanish throughout this conversation. I am a beginner.",
      ),
      assistant("Entendido."),
      user("Correction: I meant proof of stake, not proof of work."),
      assistant("Proof of stake uses validators."),
      user("What is staking?"),
    ];
    expect(selectConversationMessages(messages)).toEqual(messages);
  });

  it("reserves the current request before a 3100-token exchange under a 3200-token budget", () => {
    const prompt = "Explain this module.";
    const answer = "A".repeat(3100 * 4 - prompt.length);
    const current = user("Q".repeat(300 * 4));
    const messages = [user(prompt), assistant(answer), current];
    const snapshot = structuredClone(messages);
    const selected = selectConversationMessages(messages, 3200);

    expect(
      estimateTokenUsage(selected.map((message) => message.content)),
    ).toBeLessThanOrEqual(3200);
    expect(selected.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "user",
    ]);
    expect(selected[0]).toEqual(user(prompt));
    expect(selected[1].content).toContain("omitted due to history budget");
    expect(selected.at(-1)).toBe(current);
    expect(selected.filter((message) => message === current)).toHaveLength(1);
    expect(messages).toEqual(snapshot);
  });

  it("retains useful surrounding context from an oversized preceding exchange", () => {
    const prompt =
      "Explain decentralisation and resilience in this assessed checkpoint.";
    const answer =
      "Start with resistance to outages. " +
      "Supporting explanation. ".repeat(1000) +
      "Now share your attempt at the next advantage.";
    const current = user("Can you explain that again?");
    const selected = selectConversationMessages([
      user(prompt),
      assistant(answer),
      current,
    ]);

    expect(selected[0]).toEqual(user(prompt));
    expect(selected[1].content).toMatch(/^Start with resistance to outages/);
    expect(selected[1].content).toContain("omitted due to history budget");
    expect(selected[1].content).toMatch(
      /Now share your attempt at the next advantage\.$/,
    );
    expect(selected.at(-1)).toBe(current);
    expect(
      estimateTokenUsage(selected.map((message) => message.content)),
    ).toBeLessThanOrEqual(3200);
  });

  it("labels excerpts in both messages when both parts of the exchange are large", () => {
    const selected = selectConversationMessages(
      [
        user(
          "Assessed task: " +
            "question details ".repeat(1000) +
            " Three advantages.",
        ),
        assistant(
          "Starter idea: " +
            "supporting details ".repeat(1000) +
            " Share your attempt.",
        ),
        user("Explain that again."),
      ],
      200,
    );
    expect(selected).toHaveLength(3);
    expect(selected[0].content).toMatch(/^Assessed task:/);
    expect(selected[0].content).toContain("omitted due to history budget");
    expect(selected[0].content).toMatch(/Three advantages\.$/);
    expect(selected[1].content).toMatch(/^Starter idea:/);
    expect(selected[1].content).toContain("omitted due to history budget");
    expect(selected[1].content).toMatch(/Share your attempt\.$/);
    expect(
      estimateTokenUsage(selected.map((message) => message.content)),
    ).toBeLessThanOrEqual(200);
  });

  it("sends an oversized current request alone, unchanged and exactly once", () => {
    const current = user("Long checkpoint text. ".repeat(1000));
    const selected = selectConversationMessages([
      user("Previous question."),
      assistant("Previous guidance."),
      current,
    ]);
    expect(selected).toEqual([current]);
    expect(selected[0]).toBe(current);
    expect(estimateTokenUsage([selected[0].content])).toBeGreaterThan(3200);
  });

  it("preserves chronological order and complete recent exchanges without skipping a gap", () => {
    const current = user("What about my proposal?");
    const recent = [
      user("What does gas mean?"),
      assistant("It measures computational work."),
      current,
    ];
    const messages = [
      user("Old proposal topic."),
      assistant("Older explanation."),
      user("Intervening topic. ".repeat(100)),
      assistant("Large intervening reply. ".repeat(100)),
      ...recent,
    ];
    expect(selectConversationMessages(messages, 100)).toEqual(recent);
  });

  it("handles empty history, punctuation, repeated words and consecutive user messages", () => {
    expect(selectConversationMessages([])).toEqual([]);
    const messages = [
      user("DAO, DAO?!"),
      assistant("Let us clarify your task."),
      user("Actually, I meant Ethereum."),
      user("And proof of stake."),
    ];
    expect(selectConversationMessages(messages)).toEqual(messages);
  });

  it("keeps the current request when no space remains for a useful history excerpt", () => {
    const current = user("Explain that again.");
    expect(
      selectConversationMessages(
        [
          user("Original question. ".repeat(100)),
          assistant("Answer. ".repeat(100)),
          current,
        ],
        5,
      ),
    ).toEqual([current]);
  });
});

describe("before/after token comparison", () => {
  const conversationHistory: Message[] = [
    user("What is a smart contract?"),
    assistant(
      "A smart contract is a self-executing program stored on a blockchain. It automatically enforces the terms of an agreement when predefined conditions are met, without needing a middleman.",
    ),
    user("How does gas work on Ethereum?"),
    assistant(
      "Gas is the unit that measures the computational effort required to execute operations on Ethereum. Every transaction requires gas, and users pay a gas fee in ETH to compensate validators for processing the work.",
    ),
    user("What is a DAO?"),
    assistant(
      "A DAO (Decentralized Autonomous Organization) is an organization governed by smart contracts and collective decision-making rather than a central authority. Members typically vote on proposals using governance tokens.",
    ),
    user("I opened the Ocean DAO proposal page."),
    assistant(
      "Great! From the Proposals tab you can view active proposals, check voting status, and cast your vote if you are a member of that DAO.",
    ),
    user("Can you explain token staking?"),
    assistant(
      "Token staking involves locking up cryptocurrency tokens to support network operations like validation. In return, stakers earn rewards. It is a core mechanism in proof-of-stake blockchains.",
    ),
  ];

  it("reduces system instruction tokens for a learning question", () => {
    const question = "What is a smart contract?";
    const selectedNav = selectNavigationEntries(question);

    const beforeInstruction = buildAiTutorInstruction(undefined, SITE_GUIDE);
    const afterInstruction = buildAiTutorInstruction(undefined, selectedNav);

    const beforeTokens = estimateTokenUsage([beforeInstruction]);
    const afterTokens = estimateTokenUsage([afterInstruction]);

    console.log(
      `[Learning question] System instruction: ${beforeTokens} → ${afterTokens} estimated input tokens (saved ${beforeTokens - afterTokens}, nav entries: ${SITE_GUIDE.length} → ${selectedNav.length})`,
    );

    expect(selectedNav).toHaveLength(0);
    expect(afterTokens).toBeLessThan(beforeTokens);
    expect(beforeTokens - afterTokens).toBeGreaterThan(500);
  });

  it("reduces system instruction tokens for a navigation question", () => {
    const question = "Where do I vote on a proposal?";
    const selectedNav = selectNavigationEntries(question);

    const beforeInstruction = buildAiTutorInstruction(undefined, SITE_GUIDE);
    const afterInstruction = buildAiTutorInstruction(undefined, selectedNav);

    const beforeTokens = estimateTokenUsage([beforeInstruction]);
    const afterTokens = estimateTokenUsage([afterInstruction]);

    console.log(
      `[Navigation question] System instruction: ${beforeTokens} → ${afterTokens} estimated input tokens (saved ${beforeTokens - afterTokens}, nav entries: ${SITE_GUIDE.length} → ${selectedNav.length})`,
    );

    expect(selectedNav.length).toBeGreaterThan(0);
    expect(selectedNav.length).toBeLessThan(SITE_GUIDE.length);
    expect(afterTokens).toBeLessThan(beforeTokens);
  });

  it("preserves the entire short representative conversation", () => {
    const question = "Where do I vote?";
    const allMessages = [...conversationHistory, user(question)];
    const selectedMessages = selectConversationMessages(allMessages);

    const beforeTokens = estimateTokenUsage(allMessages.map((m) => m.content));
    const afterTokens = estimateTokenUsage(
      selectedMessages.map((m) => m.content),
    );

    console.log(
      `[Short history] Conversation: ${beforeTokens} → ${afterTokens} estimated input tokens (saved ${beforeTokens - afterTokens}, messages: ${allMessages.length} → ${selectedMessages.length})`,
    );

    expect(selectedMessages).toEqual(allMessages);
    expect(afterTokens).toBe(beforeTokens);
    expect(selectedMessages.at(-1)).toEqual(user(question));
  });

  it("reduces total input tokens across instruction and history combined", () => {
    const question = "Where do I vote on a proposal?";
    const allMessages = [...conversationHistory, user(question)];
    const selectedNav = selectNavigationEntries(question);
    const selectedMessages = selectConversationMessages(allMessages);

    const beforeInstruction = buildAiTutorInstruction(undefined, SITE_GUIDE);
    const afterInstruction = buildAiTutorInstruction(undefined, selectedNav);

    const beforeTotal = estimateTokenUsage([
      beforeInstruction,
      ...allMessages.map((m) => m.content),
    ]);
    const afterTotal = estimateTokenUsage([
      afterInstruction,
      ...selectedMessages.map((m) => m.content),
    ]);

    const reductionPercent = ((beforeTotal - afterTotal) / beforeTotal) * 100;

    console.log(
      `[Total input] Combined: ${beforeTotal} → ${afterTotal} estimated input tokens (saved ${beforeTotal - afterTotal}, reduction: ${reductionPercent.toFixed(1)}%)`,
    );

    expect(afterTotal).toBeLessThan(beforeTotal);
    expect(reductionPercent).toBeGreaterThan(20);
    expect(selectedMessages).toEqual(allMessages);
    expect(selectedNav).toEqual([
      SITE_GUIDE.find((entry) => entry.id === "dao-details"),
    ]);
  });

  it("bounds a long conversation while retaining its complete recent task", () => {
    const olderMessages = Array.from({ length: 30 }, (_, index) => [
      user(
        `Earlier lesson ${index + 1}: explain smart contracts and Ethereum gas.`,
      ),
      assistant(
        "A smart contract is a program on a blockchain. Gas measures the computational effort of executing transactions. Validators process this work, and fees depend on demand. ".repeat(
          3,
        ),
      ),
    ]).flat();
    const recentMessages = [
      user(
        "My assessed checkpoint asks for three advantages of decentralisation.",
      ),
      assistant("Start by thinking about resistance to outages."),
      user("What is an outage?"),
      assistant("An outage is a period when a service is unavailable."),
      user("Okay, explain the next point."),
    ];
    const allMessages = [...olderMessages, ...recentMessages];
    const page = { path: "/portal" as const, title: "Course Portal" };
    const selectedMessages = selectConversationMessages(allMessages);
    const selectedNav = selectNavigationEntries(
      recentMessages.at(-1)!.content,
      page,
    );
    const beforeTotal = estimateTokenUsage([
      buildAiTutorInstruction(page, SITE_GUIDE),
      ...allMessages.map((message) => message.content),
    ]);
    const afterTotal = estimateTokenUsage([
      buildAiTutorInstruction(page, selectedNav),
      ...selectedMessages.map((message) => message.content),
    ]);
    console.log(
      `[Long conversation with page context] Combined: ${beforeTotal} → ${afterTotal} estimated input tokens`,
    );

    expect(selectedMessages.slice(-recentMessages.length)).toEqual(
      recentMessages,
    );
    expect(selectedMessages).toEqual(
      allMessages.slice(-selectedMessages.length),
    );
    expect(
      estimateTokenUsage(selectedMessages.map((message) => message.content)),
    ).toBeLessThanOrEqual(3200);
    expect(afterTotal).toBeLessThan(beforeTotal);
    expect(selectedNav).toEqual([]);
  });

  it("preserves core tutor instructions in every scenario", () => {
    const scenarios = [
      { question: "What is a smart contract?", label: "learning" },
      { question: "Where do I vote on a proposal?", label: "navigation" },
      {
        question: "How can I ask a human tutor for more help?",
        label: "support",
      },
    ];

    for (const { question } of scenarios) {
      const selectedNav = selectNavigationEntries(question);
      const instruction = buildAiTutorInstruction(undefined, selectedNav);

      expect(instruction).toContain(AI_TUTOR_SYSTEM_PROMPT);
    }
  });
});
