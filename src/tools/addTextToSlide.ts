import { slides_v1 } from 'googleapis';
import { handleGoogleApiError } from '../utils/errorHandler.js';
import { parseMarkdownToFormattedText, generateTextFormattingRequests } from '../utils/markdownParser.js';
import {
  LAYOUT_DIMENSIONS,
  FONT_SIZE_RANGES,
  calculateOptimalFontSize,
  createElementProperties,
  generateObjectId,
} from '../utils/slideHelpers.js';

export interface AddTextToSlideArgs {
  presentationId: string;
  slideId: string;
  text: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  autoFitText?: boolean;
  textType?: 'TITLE' | 'BODY' | 'CAPTION';
}

/**
 * Adds formatted text to an existing slide with markdown support and automatic text fitting.
 * @param slides The authenticated Google Slides API client.
 * @param args The arguments for adding the text.
 * @returns A promise resolving to the MCP response content.
 * @throws McpError if the Google API call fails.
 */
export const addTextToSlideTool = async (slides: slides_v1.Slides, args: AddTextToSlideArgs) => {
  try {
    const textObjectId = generateObjectId('text');

    // Use provided dimensions or defaults based on text type
    const textType = args.textType || 'BODY';
    let defaultDimensions: { x: number; y: number; width: number; height: number };
    let defaultFontRange: { min: number; max: number; default: number };

    if (textType === 'TITLE') {
      defaultDimensions = { ...LAYOUT_DIMENSIONS.TITLE };
      defaultFontRange = { ...FONT_SIZE_RANGES.TITLE };
    } else {
      defaultDimensions = { ...LAYOUT_DIMENSIONS.BODY };
      defaultFontRange = { ...FONT_SIZE_RANGES.BODY };
    }

    const x = args.x || defaultDimensions.x;
    const y = args.y || defaultDimensions.y;
    const width = args.width || defaultDimensions.width;
    const height = args.height || defaultDimensions.height;

    // Parse the text for markdown formatting
    const textSegments = parseMarkdownToFormattedText(args.text);
    const plainText = textSegments.map((s) => s.text).join('');

    // Calculate optimal font size if not provided and autoFitText is enabled
    let fontSize = args.fontSize;
    const autoFitText = args.autoFitText !== false; // Default to true

    if (!fontSize && autoFitText) {
      fontSize = calculateOptimalFontSize(plainText, width, height, defaultFontRange);
    } else if (!fontSize) {
      fontSize = defaultFontRange.default;
    }

    const requests: slides_v1.Schema$Request[] = [
      // Create the text box
      {
        createShape: {
          objectId: textObjectId,
          shapeType: 'TEXT_BOX',
          elementProperties: createElementProperties(args.slideId, x, y, width, height),
        },
      },
      // Insert the text
      {
        insertText: {
          objectId: textObjectId,
          text: plainText,
          insertionIndex: 0,
        },
      },
      // Set default text style
      {
        updateTextStyle: {
          objectId: textObjectId,
          textRange: { type: 'ALL' },
          style: {
            fontSize: { magnitude: fontSize, unit: 'PT' },
            fontFamily: 'Arial',
          },
          fields: 'fontSize,fontFamily',
        },
      },
    ];

    // Add specific styling based on text type
    if (textType === 'TITLE') {
      requests.push({
        updateTextStyle: {
          objectId: textObjectId,
          textRange: { type: 'ALL' },
          style: {
            bold: true,
          },
          fields: 'bold',
        },
      });
    }

    // Add markdown formatting requests
    requests.push(...generateTextFormattingRequests(textObjectId, textSegments));

    // If autoFitText is enabled, add autofit properties
    if (autoFitText) {
      requests.push({
        updateShapeProperties: {
          objectId: textObjectId,
          shapeProperties: {
            autofit: {
              autofitType: 'SHAPE_AUTOFIT',
              fontScale: 1.0,
              lineSpacingReduction: 0.1,
            },
          },
          fields: 'autofit',
        },
      });
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
              message: 'Successfully added text to slide',
              textObjectId,
              slideId: args.slideId,
              textType,
              textLength: plainText.length,
              fontSize,
              autoFitText,
              markdownSegments: textSegments.length,
              position: { x, y },
              size: { width, height },
              response: response.data,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    throw handleGoogleApiError(error, 'add_text_to_slide');
  }
};
