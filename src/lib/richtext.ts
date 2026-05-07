// Helpers for rendering Contentful RichText documents.
//
// `richTextToHtml` produces HTML with project-specific class names so the
// rendered output drops in next to existing markup without restyling.
// `richTextParagraphs` and `extractHeadingPairs` are convenience extractors
// for sections that absolutely-position individual paragraphs / heading
// pairs on the canvas (Ubicacion, AboutCarousel slide 3) — those layouts
// can't render a single HTML blob.

import { documentToHtmlString, type Options } from '@contentful/rich-text-html-renderer';
import { MARKS } from '@contentful/rich-text-types';

type RichTextDoc = unknown;

/** Render a RichText document to HTML, mapping bold marks to a span the
 *  rest of the codebase already styles via Tailwind utilities. */
export function richTextToHtml(doc: RichTextDoc, extra?: Options): string {
  if (!doc) return '';
  return documentToHtmlString(doc as any, {
    renderMark: {
      [MARKS.BOLD]: (text) => `<span class="font-bold">${text}</span>`,
      ...(extra?.renderMark ?? {}),
    },
    renderNode: {
      ...(extra?.renderNode ?? {}),
    },
  });
}

/** Concatenate all text inside a node tree (any nesting). */
function nodeText(node: any): string {
  if (typeof node?.value === 'string') return node.value;
  if (!node?.content) return '';
  return node.content.map(nodeText).join('');
}

/** Plain text (newline-joined paragraph content), trimmed. */
export function richTextToPlain(doc: any): string {
  if (!doc?.content) return '';
  return doc.content.map((n: any) => nodeText(n)).join('\n').trim();
}

/** All top-level paragraphs returned as their concatenated text. Empty
 *  paragraphs are preserved so the caller can index by source position. */
export function richTextParagraphs(doc: any): string[] {
  if (!doc?.content) return [];
  return doc.content
    .filter((n: any) => n.nodeType === 'paragraph')
    .map((n: any) => nodeText(n));
}

/** Extract pairs of [headingType -> next non-empty paragraph]. Pairs are
 *  emitted in the order they appear in the document. Used by the
 *  amenidades grid (heading-3 + paragraph). */
export function extractHeadingPairs(
  doc: any,
  headingType: string = 'heading-3',
): Array<{ title: string; description: string }> {
  if (!doc?.content) return [];
  const items: Array<{ title: string; description: string }> = [];
  let currentTitle = '';
  for (const node of doc.content) {
    if (node.nodeType === headingType) {
      currentTitle = nodeText(node).trim();
    } else if (node.nodeType === 'paragraph' && currentTitle) {
      const text = nodeText(node).trim();
      if (text) {
        items.push({ title: currentTitle, description: text });
        currentTitle = '';
      }
    }
  }
  return items;
}

/** First heading of the given type as plain text. */
export function firstHeading(doc: any, headingType: string = 'heading-2'): string {
  if (!doc?.content) return '';
  const node = doc.content.find((n: any) => n.nodeType === headingType);
  return node ? nodeText(node).trim() : '';
}

/** Render a RichText document but with the first heading-N stripped, so
 *  the caller can render that heading separately (different font/size)
 *  and let the body render the remaining paragraphs. */
export function richTextHtmlWithoutFirstHeading(
  doc: any,
  headingType: string = 'heading-2',
): string {
  if (!doc?.content) return '';
  let removed = false;
  const filtered = {
    ...doc,
    content: doc.content.filter((n: any) => {
      if (!removed && n.nodeType === headingType) {
        removed = true;
        return false;
      }
      return true;
    }),
  };
  return richTextToHtml(filtered);
}

/** Resolve a Contentful asset link to an absolute https: URL. */
export function assetUrl(asset: any, fallback: string = ''): string {
  const url = asset?.fields?.file?.url;
  if (!url) return fallback;
  return url.startsWith('//') ? `https:${url}` : url;
}

/** Split the first paragraph of a RichText document into two paragraphs at
 *  the first inline node that carries a bold mark. Useful when Contentful
 *  authors stored copy as a single paragraph but the visual design wants
 *  two paragraphs separated at the bold-emphasized term (e.g. brand name).
 *  No-op if there is no bold mark or it sits at the very start. */
export function splitParagraphAtFirstBold(doc: any): any {
  if (!doc?.content) return doc;
  const newContent: any[] = [];
  let split = false;
  for (const node of doc.content) {
    if (!split && node?.nodeType === 'paragraph' && Array.isArray(node.content)) {
      const idx = node.content.findIndex((c: any) =>
        Array.isArray(c?.marks) && c.marks.some((m: any) => m.type === 'bold'),
      );
      if (idx > 0) {
        newContent.push({ ...node, content: node.content.slice(0, idx) });
        newContent.push({ ...node, content: node.content.slice(idx) });
        split = true;
        continue;
      }
    }
    newContent.push(node);
  }
  return { ...doc, content: newContent };
}
