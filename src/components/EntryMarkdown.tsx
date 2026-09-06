import React from "react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

interface EntryMarkdownProps {
  content: string;
}

export const EntryMarkdown: React.FC<EntryMarkdownProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-slate max-w-none text-slate-200 leading-relaxed space-y-2 text-sm md:text-base selection:bg-indigo-900/60 font-sans">
      <Markdown rehypePlugins={[rehypeSanitize]}>
        {content}
      </Markdown>
    </div>
  );
};
