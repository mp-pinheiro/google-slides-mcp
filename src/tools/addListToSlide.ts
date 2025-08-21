import { slides_v1 } from 'googleapis';
import { handleGoogleApiError } from '../utils/errorHandler.js';
import { parseMarkdownList } from '../utils/markdownParser.js';
import {
  LAYOUT_DIMENSIONS,
  FONT_SIZE_RANGES,
  calculateOptimalFontSize,
  createElementProperties,
  generateObjectId,
} from '../utils/slideHelpers.js';

export interface AddListToSlideArgs {
  presentationId: string;
  slideId: string;
  listContent: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  bulletStyle?:
    | 'BULLET_DISC_CIRCLE_SQUARE'
    | 'BULLET_CIRCLE_HOLLOW'
    | 'BULLET_DIAMOND_X'
    | 'NUMBERED_DECIMAL'
    | 'NUMBERED_ALPHA_LOWER';
}

/**
 * Adds a formatted list to an existing slide, supporting both markdown and direct list content.
 * @param slides The authenticated Google Slides API client.
 * @param args The arguments for adding the list.
 * @returns A promise resolving to the MCP response content.
 * @throws McpError if the Google API call fails.
 */
export const addListToSlideTool = async (slides: slides_v1.Slides, args: AddListToSlideArgs) => {
  try {
    const listObjectId = generateObjectId('list');

    // Use provided dimensions or defaults
    const x = args.x || LAYOUT_DIMENSIONS.BODY.x;
    const y = args.y || LAYOUT_DIMENSIONS.BODY.y;
    const width = args.width || LAYOUT_DIMENSIONS.BODY.width;
    const height = args.height || LAYOUT_DIMENSIONS.BODY.height;

    // Parse the list content
    const listItems = parseMarkdownList(args.listContent);

    if (listItems.length === 0) {
      throw new Error('No valid list items found in the provided content');
    }

    // Determine if it's primarily numbered or bulleted based on first item
    const isNumberedList = listItems[0].isNumbered;
    const bulletStyle = args.bulletStyle || (isNumberedList ? 'NUMBERED_DECIMAL' : 'BULLET_DISC_CIRCLE_SQUARE');

    // Combine all list items into formatted text with proper line breaks
    const listText = listItems
      .map((item) => {
        // Add indentation for nested items
        const indentation = '  '.repeat(item.level);
        return `${indentation}${item.text}`;
      })
      .join('\n');

    // Calculate optimal font size
    const fontSize = calculateOptimalFontSize(listText, width, height, FONT_SIZE_RANGES.LIST);

    const requests: slides_v1.Schema$Request[] = [
      // Create the list text box
      {
        createShape: {
          objectId: listObjectId,
          shapeType: 'TEXT_BOX',
          elementProperties: createElementProperties(args.slideId, x, y, width, height),
        },
      },
      // Insert the list text
      {
        insertText: {
          objectId: listObjectId,
          text: listText,
          insertionIndex: 0,
        },
      },
      // Set default text style
      {
        updateTextStyle: {
          objectId: listObjectId,
          textRange: { type: 'ALL' },
          style: {
            fontSize: { magnitude: fontSize, unit: 'PT' },
            fontFamily: 'Arial',
          },
          fields: 'fontSize,fontFamily',
        },
      },
      // Apply list formatting
      {
        createParagraphBullets: {
          objectId: listObjectId,
          textRange: { type: 'ALL' },
          bulletPreset: bulletStyle,
        },
      },
    ];

    // Apply different bullet styles for different nesting levels if we have nested items
    const hasNestedItems = listItems.some((item) => item.level > 0);
    if (hasNestedItems) {
      // Group items by level for different formatting
      const levelGroups: { [level: number]: { start: number; end: number }[] } = {};
      let currentIndex = 0;

      for (const item of listItems) {
        const itemText = '  '.repeat(item.level) + item.text + '\n';
        const startIndex = currentIndex;
        const endIndex = currentIndex + itemText.length - 1; // -1 because we don't want to include the newline

        if (!levelGroups[item.level]) {
          levelGroups[item.level] = [];
        }
        levelGroups[item.level].push({ start: startIndex, end: endIndex });

        currentIndex += itemText.length;
      }

      // Apply different bullet styles for each level
      const bulletStyles = [
        bulletStyle,
        isNumberedList ? 'NUMBERED_ALPHA_LOWER' : 'BULLET_CIRCLE_HOLLOW',
        isNumberedList ? 'NUMBERED_DECIMAL' : 'BULLET_DIAMOND_X',
      ];

      for (const [level, ranges] of Object.entries(levelGroups)) {
        const levelNum = parseInt(level);
        if (levelNum > 0 && levelNum < bulletStyles.length) {
          for (const range of ranges) {
            requests.push({
              createParagraphBullets: {
                objectId: listObjectId,
                textRange: {
                  type: 'FIXED_RANGE',
                  startIndex: range.start,
                  endIndex: range.end,
                },
                bulletPreset: bulletStyles[levelNum],
              },
            });
          }
        }
      }
    }

    // Execute the batch update
    const response = await slides.presentations.batchUpdate({
      presentationId: args.presentationId,
      requestBody: { requests },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: 'Successfully added list to slide',
              listObjectId,
              slideId: args.slideId,
              itemCount: listItems.length,
              bulletStyle,
              hasNestedItems,
              fontSize,
              response: response.data,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    throw handleGoogleApiError(error, 'add_list_to_slide');
  }
};
