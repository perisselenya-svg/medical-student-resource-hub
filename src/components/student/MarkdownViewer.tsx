import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders uploaded Markdown notes safely.
 * SECURITY: `skipHtml` drops any raw HTML in the file, and react-markdown's
 * default URL transform neutralises javascript:/data: links, so an uploaded
 * note cannot inject scripts. GFM adds tables, task lists and strikethrough.
 */
export function MarkdownViewer({ source }: { source: string }) {
  return (
    <div className="prose-notes">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml>
        {source}
      </Markdown>
    </div>
  );
}
