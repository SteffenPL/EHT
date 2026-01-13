import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export function MarkdownPage({ content }: { content: string }) {
  return (
    <div className="max-w-3xl mx-auto p-8 prose-container">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
      <style>{`
        .prose-container { line-height: 1.6; }
        .prose-container h1 { font-size: 1.75rem; font-weight: 700; margin: 0 0 1rem; border-bottom: 1px solid hsl(var(--border)); padding-bottom: 0.5rem; }
        .prose-container h2 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
        .prose-container h3 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
        .prose-container p { margin: 0.75rem 0; }
        .prose-container ul, .prose-container ol { margin: 0.5rem 0; padding-left: 1.5rem; }
        .prose-container li { margin: 0.25rem 0; }
        .prose-container code { background: hsl(var(--muted)); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875em; }
        .prose-container pre { background: hsl(var(--muted)); padding: 0.75rem; border-radius: 0.375rem; overflow-x: auto; margin: 0.75rem 0; }
        .prose-container pre code { background: none; padding: 0; }
      `}</style>
    </div>
  );
}
