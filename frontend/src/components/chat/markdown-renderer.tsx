"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check } from "lucide-react";

function CodeBlock({ children, className, ...props }: ComponentPropsWithoutRef<"code">) {
  const [copied, setCopied] = useState(false);
  const isInline = !className;

  if (isInline) {
    return (
      <code
        className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800"
        {...props}
      >
        {children}
      </code>
    );
  }

  async function handleCopy() {
    const text = String(children).replace(/\n$/, "");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded-md border border-zinc-300 bg-white/80 p-1.5 text-zinc-500 opacity-0 backdrop-blur transition-opacity hover:bg-white group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <code className={className} {...props}>
        {children}
      </code>
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: CodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
