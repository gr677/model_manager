/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface WordColorSwatch {
  key: string;
  label: string;
  swatchHex: string;
  stickyHex: string;
  darkHex: string;
}

export const WORD_COLOR_PALETTE: WordColorSwatch[] = [
  { key: 'red', label: 'Red', swatchHex: '#ef4444', stickyHex: '#dc2626', darkHex: '#f87171' },
  { key: 'blue', label: 'Blue', swatchHex: '#3b82f6', stickyHex: '#2563eb', darkHex: '#60a5fa' },
  { key: 'green', label: 'Green', swatchHex: '#22c55e', stickyHex: '#15803d', darkHex: '#4ade80' },
  { key: 'amber', label: 'Orange', swatchHex: '#f97316', stickyHex: '#c2410c', darkHex: '#fb923c' },
  { key: 'purple', label: 'Purple', swatchHex: '#a855f7', stickyHex: '#7e22ce', darkHex: '#c084fc' },
  { key: 'pink', label: 'Pink', swatchHex: '#ec4899', stickyHex: '#be185d', darkHex: '#f472b6' },
  { key: 'teal', label: 'Teal', swatchHex: '#14b8a6', stickyHex: '#0f766e', darkHex: '#2dd4bf' },
  { key: 'black', label: 'Ink Black', swatchHex: '#1f2937', stickyHex: '#111827', darkHex: '#f8fafc' },
];

const COLOR_BY_KEY = new Map<string, WordColorSwatch>(
  WORD_COLOR_PALETTE.map(item => [item.key.toLowerCase(), item])
);

const COLOR_TAG_REGEX = /\[c:(#[0-9a-fA-F]{6}|[a-zA-Z]+)\]([\s\S]*?)\[\/c\]/g;
const STRIP_COLOR_TAGS_REGEX = /\[c:(?:#[0-9a-fA-F]{6}|[a-zA-Z]+)\]|\[\/c\]/g;
const OPEN_COLOR_TAG_SUFFIX_REGEX = /\[c:(#[0-9a-fA-F]{6}|[a-zA-Z]+)\]$/;
const STRICT_HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

function resolveWordColorHex(rawColor: string, variant: 'sticky' | 'dark'): string | null {
  const normalized = rawColor.trim().toLowerCase();
  const preset = COLOR_BY_KEY.get(normalized);
  if (preset) {
    return variant === 'dark' ? preset.darkHex : preset.stickyHex;
  }
  if (STRICT_HEX_REGEX.test(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Strips `[c:color]...[/c]` word-color tags and returns plain text.
 */
export function stripWordColorMarkup(text: string): string {
  if (!text) return text;
  return text.replace(STRIP_COLOR_TAGS_REGEX, '');
}

/**
 * Safely tokenizes `[c:color]text[/c]` into React nodes without raw HTML injection.
 */
export function renderColoredText(
  text: string,
  variant: 'sticky' | 'dark' = 'sticky'
): React.ReactNode {
  if (!text) return null;
  if (!text.includes('[c:')) return text;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(COLOR_TAG_REGEX.source, 'g');
  let keyCounter = 0;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, rawColor, innerText] = match;
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex));
    }

    const resolvedColor = resolveWordColorHex(rawColor, variant);
    if (resolvedColor) {
      nodes.push(
        <span
          key={`wc-${keyCounter++}`}
          className="font-semibold"
          style={{ color: resolvedColor }}
        >
          {innerText}
        </span>
      );
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? <>{nodes}</> : text;
}

/**
 * Applies or clears a `[c:color]...[/c]` tag around a textarea selection or cursor word.
 * Selecting a word keeps the inner word highlighted so subsequent swatch clicks swap colors cleanly.
 */
export function applyWordColorToText(
  text: string,
  selStart: number,
  selEnd: number,
  colorKey: string | null
): {
  nextText: string;
  nextSelStart: number;
  nextSelEnd: number;
} {
  let start = Math.max(0, Math.min(selStart, selEnd, text.length));
  let end = Math.max(0, Math.min(Math.max(selStart, selEnd), text.length));

  // 1. Collapsed cursor: check if inside an existing [c:...]...[/c] span, or expand to word
  if (start === end) {
    const regex = new RegExp(COLOR_TAG_REGEX.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const fullStart = match.index;
      const fullEnd = fullStart + match[0].length;
      if (start >= fullStart && start <= fullEnd) {
        const inner = match[2];
        if (!colorKey) {
          const nextText = text.slice(0, fullStart) + inner + text.slice(fullEnd);
          return {
            nextText,
            nextSelStart: fullStart,
            nextSelEnd: fullStart + inner.length,
          };
        }
        const replacement = `[c:${colorKey}]${inner}[/c]`;
        const nextText = text.slice(0, fullStart) + replacement + text.slice(fullEnd);
        const newInnerStart = fullStart + `[c:${colorKey}]`.length;
        return {
          nextText,
          nextSelStart: newInnerStart,
          nextSelEnd: newInnerStart + inner.length,
        };
      }
    }

    // Not inside a tag: expand around non-whitespace word characters at cursor
    const isWordChar = (ch: string) => Boolean(ch) && !/[\s\[\]]/.test(ch);
    let wStart = start;
    let wEnd = start;
    while (wStart > 0 && isWordChar(text[wStart - 1])) wStart--;
    while (wEnd < text.length && isWordChar(text[wEnd])) wEnd++;

    // Also handle cursor right after a word (e.g. "hello|" with space after)
    if (wStart === wEnd && start > 0 && isWordChar(text[start - 1])) {
      wStart = start - 1;
      wEnd = start;
      while (wStart > 0 && isWordChar(text[wStart - 1])) wStart--;
    }

    if (wStart < wEnd) {
      start = wStart;
      end = wEnd;
    } else {
      if (!colorKey) {
        return { nextText: text, nextSelStart: start, nextSelEnd: end };
      }
      const placeholder = 'word';
      const insertion = `[c:${colorKey}]${placeholder}[/c]`;
      const nextText = text.slice(0, start) + insertion + text.slice(end);
      const innerStart = start + `[c:${colorKey}]`.length;
      return {
        nextText,
        nextSelStart: innerStart,
        nextSelEnd: innerStart + placeholder.length,
      };
    }
  } else {
    // Trim accidental leading/trailing whitespace from selection if there is non-whitespace content
    const rawSelected = text.slice(start, end);
    if (rawSelected.trim().length > 0) {
      const leadSpaces = rawSelected.length - rawSelected.trimStart().length;
      const trailSpaces = rawSelected.length - rawSelected.trimEnd().length;
      start += leadSpaces;
      end -= trailSpaces;
    }
  }

  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);

  // 2. If selection sits directly inside [c:old]...[/c], replace/clear the outer tag instead of nesting
  const openMatch = before.match(OPEN_COLOR_TAG_SUFFIX_REGEX);
  if (openMatch && after.startsWith('[/c]')) {
    const outerPrefix = before.slice(0, before.length - openMatch[0].length);
    const outerSuffix = after.slice('[/c]'.length);
    const cleanSelected = stripWordColorMarkup(selected);

    if (!colorKey) {
      const nextText = outerPrefix + cleanSelected + outerSuffix;
      return {
        nextText,
        nextSelStart: outerPrefix.length,
        nextSelEnd: outerPrefix.length + cleanSelected.length,
      };
    }

    const newOpen = `[c:${colorKey}]`;
    const nextText = outerPrefix + newOpen + cleanSelected + '[/c]' + outerSuffix;
    const innerStart = outerPrefix.length + newOpen.length;
    return {
      nextText,
      nextSelStart: innerStart,
      nextSelEnd: innerStart + cleanSelected.length,
    };
  }

  // 3. Standard non-empty selection: strip any partial/existing tags inside selection, then wrap or leave plain
  const cleanSelected = stripWordColorMarkup(selected);
  if (!colorKey) {
    const nextText = before + cleanSelected + after;
    return {
      nextText,
      nextSelStart: before.length,
      nextSelEnd: before.length + cleanSelected.length,
    };
  }

  const newOpen = `[c:${colorKey}]`;
  const nextText = before + newOpen + cleanSelected + '[/c]' + after;
  const innerStart = before.length + newOpen.length;
  return {
    nextText,
    nextSelStart: innerStart,
    nextSelEnd: innerStart + cleanSelected.length,
  };
}
