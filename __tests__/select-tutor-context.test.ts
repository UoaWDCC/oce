import { describe, expect, it } from "vitest";
import {
  selectConversationMessages,
  selectNavigationEntries,
} from "@/features/chatbot/server/context/selectTutorContext";
import { SITE_GUIDE } from "@/features/chatbot/server/knowledge/siteGuide";
import { buildAiTutorInstruction } from "@/features/chatbot/server/prompts/buildAiTutorInstruction";
import { estimateTokenUsage } from "@/utils/aiTutorTokenUsage";
import type { Message } from "@/llm/types/Message";

function user(content: string): Message {
  return { role: "user", content };
}

function assistant(content: string): Message {
  return { role: "assistant", content };
}

describe("selectNavigationEntries", () => {
  it("does not include navigation for a learning question", () => {
    expect(selectNavigationEntries("What is a smart contract?")).toEqual([]);
  });

  it("selects navigation entries matching the question", () => {
    expect(
      selectNavigationEntries("Where do I vote on a proposal?").map(
        (entry) => entry.id,
      ),
    ).toContain("dao-details");
  });

  it("uses the resolved page as an additional signal", () => {
    expect(
      selectNavigationEntries("How do I use this page?", {
        path: "/portal",
        title: "Course Portal",
      }).map((entry) => entry.id),
    ).toContain("course-portal");
  });
});

describe("selectConversationMessages", () => {
  it("keeps the latest turn and a relevant older turn", () => {
    const messages = [
      user("What is a smart contract?"),
      assistant("A smart contract is a program on a blockchain."),
      user("I opened the Ocean DAO proposal."),
      assistant("Open the Proposals tab to review it."),
      user("What does gas mean?"),
      assistant("Gas is the fee for a blockchain transaction."),
      user("Where do I vote?"),
    ];

    const selected = selectConversationMessages(messages, "Where do I vote?", [
      {
        id: "dao-details",
        keywords: ["proposals", "vote"],
        title: "DAO Details",
        steps: [],
      },
    ]);

    expect(selected).toEqual([
      user("I opened the Ocean DAO proposal."),
      assistant("Open the Proposals tab to review it."),
      user("What does gas mean?"),
      assistant("Gas is the fee for a blockchain transaction."),
      user("Where do I vote?"),
    ]);
  });

  it("keeps user and assistant messages in chronological order", () => {
    const messages = [
      user("How do I find my DAO?"),
      assistant("Open the Course Portal."),
      user("Where do I vote?"),
    ];

    expect(
      selectConversationMessages(messages, "Where do I vote?").map(
        (message) => message.content,
      ),
    ).toEqual(messages.map((message) => message.content));
  });

  it("respects the history token budget while keeping the latest turn", () => {
    const messages = [
      user("old dao proposal context".repeat(20)),
      assistant("old answer".repeat(20)),
      user("latest question"),
    ];

    const selected = selectConversationMessages(
      messages,
      "latest question",
      [],
      5,
    );

    expect(selected.at(-1)).toEqual(user("latest question"));
    expect(selected.length).toBeLessThan(messages.length);
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
      `[Learning question] System instruction: ${beforeTokens} → ${afterTokens} tokens (saved ${beforeTokens - afterTokens}, nav entries: ${SITE_GUIDE.length} → ${selectedNav.length})`,
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
      `[Navigation question] System instruction: ${beforeTokens} → ${afterTokens} tokens (saved ${beforeTokens - afterTokens}, nav entries: ${SITE_GUIDE.length} → ${selectedNav.length})`,
    );

    expect(selectedNav.length).toBeGreaterThan(0);
    expect(selectedNav.length).toBeLessThan(SITE_GUIDE.length);
    expect(afterTokens).toBeLessThan(beforeTokens);
  });

  it("reduces conversation history tokens by pruning irrelevant turns", () => {
    const question = "Where do I vote?";
    const selectedNav = selectNavigationEntries(question);

    const allMessages = [...conversationHistory, user(question)];
    const selectedMessages = selectConversationMessages(
      allMessages,
      question,
      selectedNav,
    );

    const beforeTokens = estimateTokenUsage(
      allMessages.map((m) => m.content),
    );
    const afterTokens = estimateTokenUsage(
      selectedMessages.map((m) => m.content),
    );

    console.log(
      `[History pruning] Conversation: ${beforeTokens} → ${afterTokens} tokens (saved ${beforeTokens - afterTokens}, messages: ${allMessages.length} → ${selectedMessages.length})`,
    );

    expect(selectedMessages.length).toBeLessThan(allMessages.length);
    expect(afterTokens).toBeLessThan(beforeTokens);
    expect(selectedMessages.at(-1)).toEqual(user(question));
  });

  it("reduces total input tokens across instruction and history combined", () => {
    const question = "Where do I vote on a proposal?";
    const allMessages = [...conversationHistory, user(question)];
    const selectedNav = selectNavigationEntries(question);
    const selectedMessages = selectConversationMessages(
      allMessages,
      question,
      selectedNav,
    );

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
      `[Total input] Combined: ${beforeTotal} → ${afterTotal} tokens (saved ${beforeTotal - afterTotal}, reduction: ${reductionPercent.toFixed(1)}%)`,
    );

    expect(afterTotal).toBeLessThan(beforeTotal);
    expect(reductionPercent).toBeGreaterThan(20);
  });

  it("preserves core tutor instructions in every scenario", () => {
    const scenarios = [
      { question: "What is a smart contract?", label: "learning" },
      { question: "Where do I vote on a proposal?", label: "navigation" },
      { question: "How do I find my DAO?", label: "navigation with page" },
    ];

    for (const { question } of scenarios) {
      const selectedNav = selectNavigationEntries(question);
      const instruction = buildAiTutorInstruction(undefined, selectedNav);

      expect(instruction).toContain(
        "You are the AI Tutor for OnChain Education",
      );
    }
  });
});
