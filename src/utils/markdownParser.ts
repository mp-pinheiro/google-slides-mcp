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
  let currentIndex = 0;

  // Regex patterns for markdown formatting
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: 'bold' as const },
    { regex: /\*([^*]+)\*/g, type: 'italic' as const },
    { regex: /__([^_]+)__/g, type: 'underline' as const },
  ];

  // Find all formatting matches
  const matches: Array<{ start: number; end: number; text: string; format: 'bold' | 'italic' | 'underline' }> = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(markdown)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        format: pattern.type,
      });
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Process text segments
  for (const match of matches) {
    // Add unformatted text before the match
    if (match.start > currentIndex) {
      const plainText = markdown.substring(currentIndex, match.start);
      if (plainText) {
        segments.push({ text: plainText });
      }
    }

    // Add formatted text
    const segment: FormattedTextSegment = { text: match.text };
    segment[match.format] = true;
    segments.push(segment);

    currentIndex = match.end;
  }

  // Add remaining unformatted text
  if (currentIndex < markdown.length) {
    const remainingText = markdown.substring(currentIndex);
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
