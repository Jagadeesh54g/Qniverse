// Minimal inline formatting for problem text:  `code`  **bold**  *italic*
import { Fragment } from 'react';

export function Inline({ text }) {
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

export function Paragraphs({ items }) {
  return items.map((t, i) => (
    <p key={i}><Inline text={t} /></p>
  ));
}
