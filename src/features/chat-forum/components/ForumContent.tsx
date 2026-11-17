"use client";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { classNames } from "../lib/classNames";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-slate-700 sm:text-base">
      <ReactMarkdown
        rehypePlugins={[
          rehypeRaw,
          [
            rehypeSanitize,
            {
              ...defaultSchema,
              tagNames: [...(defaultSchema.tagNames ?? []), "u"],
            },
          ],
        ]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">{children}</strong>
          ),
          u: ({ children }) => <u className="underline">{children}</u>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-6">{children}</ul>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl bg-indigo-950 p-4 text-sm leading-6 text-purple-100 sm:p-5 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-purple-100">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code
              className={classNames(
                "rounded bg-purple-100 px-1.5 py-0.5 font-mono text-[0.9em] text-purple-700",
                className,
              )}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function AttachedImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <img
        src={src}
        alt={alt}
        className="max-h-96 w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}
