import { slides_v1 } from 'googleapis';

/**
 * Represents a formatted text segment with its styling information.
 */
export interface FormattedTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
}

/**
 * Represents a parsed list item.
 */
export interface ParsedListItem {
  text: string;
  level: number;
  isNumbered: boolean;
}

/**
 * Represents a parsed table structure.
 */
export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/**
 * Parses markdown text and returns formatted text segments.
 * Supports **bold**, *italic*, and __underline__ formatting.
 */
export const parseMarkdownToFormattedText = (markdown: string): FormattedTextSegment[] => {
  const segments: FormattedTextSegment[] = [];

  // Process text to handle overlapping patterns correctly
  const replacements: Array<{ start: number; end: number; text: string; format: 'bold' | 'italic' | 'underline' }> = [];

  // Process all patterns and collect matches
  const allMatches: Array<{
    start: number;
    end: number;
    text: string;
    format: 'bold' | 'italic' | 'underline';
    fullMatch: string;
  }> = [];

  // Find bold patterns first (**text**)
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match;
  while ((match = boldRegex.exec(markdown)) !== null) {
    allMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      format: 'bold',
      fullMatch: match[0],
    });
  }

  // Find underline patterns (__text__)
  const underlineRegex = /__([^_]+)__/g;
  while ((match = underlineRegex.exec(markdown)) !== null) {
    allMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      format: 'underline',
      fullMatch: match[0],
    });
  }

  // Find italic patterns (*text*) - use non-greedy matching and better logic
  // Match single asterisks that aren't part of double asterisks
  let workingText = markdown;

  // First, "mask" the bold patterns to avoid conflicts
  const boldMasks: Array<{ start: number; end: number; original: string }> = [];
  for (const boldMatch of allMatches.filter((m) => m.format === 'bold')) {
    boldMasks.push({
      start: boldMatch.start,
      end: boldMatch.end,
      original: markdown.substring(boldMatch.start, boldMatch.end),
    });
  }

  // Replace bold patterns with placeholders of same length
  boldMasks.reverse().forEach((mask) => {
    const placeholder = '█'.repeat(mask.end - mask.start);
    workingText = workingText.substring(0, mask.start) + placeholder + workingText.substring(mask.end);
  });

  const italicRegex = /\*([^*\n]+?)\*/g;
  while ((match = italicRegex.exec(workingText)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;

    // Only add if it doesn't overlap with any bold pattern
    const overlapsWithBold = boldMasks.some(
      (mask) =>
        (start >= mask.start && start < mask.end) ||
        (end > mask.start && end <= mask.end) ||
        (start < mask.start && end > mask.end)
    );

    if (!overlapsWithBold) {
      // Get the original text from the unmasked markdown
      const originalText = markdown.substring(start + 1, end - 1);
      allMatches.push({
        start,
        end,
        text: originalText,
        format: 'italic',
        fullMatch: match[0],
      });
    }
  }

  // Sort by start position and remove overlaps (keep first match in case of conflict)
  allMatches.sort((a, b) => a.start - b.start);

  for (const match of allMatches) {
    // Check if this match overlaps with any already accepted replacement
    const overlaps = replacements.some(
      (r) =>
        (match.start >= r.start && match.start < r.end) ||
        (match.end > r.start && match.end <= r.end) ||
        (match.start <= r.start && match.end >= r.end)
    );

    if (!overlaps) {
      replacements.push({
        start: match.start,
        end: match.end,
        text: match.text,
        format: match.format,
      });
    }
  }

  // Sort replacements by start position
  replacements.sort((a, b) => a.start - b.start);

  // Build segments
  let textIndex = 0;
  for (const replacement of replacements) {
    // Add unformatted text before the replacement
    if (replacement.start > textIndex) {
      const plainText = markdown.substring(textIndex, replacement.start);
      if (plainText) {
        segments.push({ text: plainText });
      }
    }

    // Add formatted text
    const segment: FormattedTextSegment = { text: replacement.text };
    segment[replacement.format] = true;
    segments.push(segment);

    textIndex = replacement.end;
  }

  // Add remaining unformatted text
  if (textIndex < markdown.length) {
    const remainingText = markdown.substring(textIndex);
    if (remainingText) {
      segments.push({ text: remainingText });
    }
  }

  // If no formatting found, return the entire text as a single segment
  if (segments.length === 0) {
    segments.push({ text: markdown });
  }

  return segments;
};

/**
 * Parses markdown lists into structured list items.
 * Supports both bullet (-) and numbered (1.) lists with nesting.
 */
export const parseMarkdownList = (markdown: string): ParsedListItem[] => {
  const lines = markdown.split('\n').filter((line) => line.trim());
  const items: ParsedListItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Count leading spaces for nesting level
    const leadingSpaces = line.length - line.trimStart().length;
    const level = Math.floor(leadingSpaces / 2); // Assuming 2 spaces per level

    // Check for bullet list
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)/);
    if (bulletMatch) {
      items.push({
        text: bulletMatch[1],
        level,
        isNumbered: false,
      });
      continue;
    }

    // Check for numbered list
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberMatch) {
      items.push({
        text: numberMatch[2],
        level,
        isNumbered: true,
      });
      continue;
    }

    // If no list markers found, treat as regular text
    items.push({
      text: trimmed,
      level,
      isNumbered: false,
    });
  }

  return items;
};

/**
 * Parses markdown table into structured table data.
 * Supports GitHub-style markdown tables with | separators.
 */
export const parseMarkdownTable = (markdown: string): ParsedTable | null => {
  const lines = markdown.split('\n').filter((line) => line.trim());
  if (lines.length < 2) return null;

  const headerLine = lines[0].trim();
  const separatorLine = lines[1].trim();

  // Check if it looks like a table
  if (!headerLine.includes('|') || !separatorLine.includes('|')) {
    return null;
  }

  // Parse headers
  const headers = headerLine
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell !== '');

  // Validate separator line
  if (!separatorLine.match(/^\|?[\s-:|]+\|?$/)) {
    return null;
  }

  // Parse data rows
  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const rowLine = lines[i].trim();
    if (!rowLine.includes('|')) continue;

    const cells = rowLine
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell !== '');

    if (cells.length > 0) {
      // Pad with empty cells if needed to match header count
      while (cells.length < headers.length) {
        cells.push('');
      }
      rows.push(cells.slice(0, headers.length));
    }
  }

  return {
    headers,
    rows,
  };
};

/**
 * Generates Google Slides API requests to format text with the given segments.
 */
export const generateTextFormattingRequests = (
  objectId: string,
  segments: FormattedTextSegment[]
): slides_v1.Schema$Request[] => {
  const requests: slides_v1.Schema$Request[] = [];
  let currentIndex = 0;

  for (const segment of segments) {
    const startIndex = currentIndex;
    const endIndex = currentIndex + segment.text.length;

    // Create text style update if formatting is needed
    if (segment.bold || segment.italic || segment.underline || segment.fontSize) {
      const style: slides_v1.Schema$TextStyle = {};
      const fields: string[] = [];

      if (segment.bold) {
        style.bold = true;
        fields.push('bold');
      }
      if (segment.italic) {
        style.italic = true;
        fields.push('italic');
      }
      if (segment.underline) {
        style.underline = true;
        fields.push('underline');
      }
      if (segment.fontSize) {
        style.fontSize = {
          magnitude: segment.fontSize,
          unit: 'PT',
        };
        fields.push('fontSize');
      }

      requests.push({
        updateTextStyle: {
          objectId,
          textRange: {
            type: 'FIXED_RANGE',
            startIndex,
            endIndex,
          },
          style,
          fields: fields.join(','),
        },
      });
    }

    currentIndex = endIndex;
  }

  return requests;
};
