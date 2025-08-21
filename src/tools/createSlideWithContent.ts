import { slides_v1 } from 'googleapis';
import { handleGoogleApiError } from '../utils/errorHandler.js';
import { parseMarkdownToFormattedText, generateTextFormattingRequests } from '../utils/markdownParser.js';
import {
  LAYOUT_DIMENSIONS,
  FONT_SIZE_RANGES,
  calculateOptimalFontSize,
  createElementProperties,
  generateObjectId,
  splitTextForSlides,
} from '../utils/slideHelpers.js';

export interface CreateSlideWithContentArgs {
  presentationId: string;
  title: string;
  content: string;
  slideIndex?: number;
  layout?: 'TITLE_AND_BODY' | 'TITLE_ONLY' | 'BLANK';
}

/**
 * Creates a new slide with title and content, handling markdown formatting and text fitting.
 * @param slides The authenticated Google Slides API client.
 * @param args The arguments for creating the slide.
 * @returns A promise resolving to the MCP response content.
 * @throws McpError if the Google API call fails.
 */
export const createSlideWithContentTool = async (slides: slides_v1.Slides, args: CreateSlideWithContentArgs) => {
  try {
    const layout = args.layout || 'TITLE_AND_BODY';
    const slideIndex = args.slideIndex || 1;

    // Split content if it's too long
    const contentSlides = splitTextForSlides(args.content);
    const createdSlides: string[] = [];

    for (let i = 0; i < contentSlides.length; i++) {
      const slideObjectId = generateObjectId('slide');
      const titleObjectId = generateObjectId('title');
      const contentObjectId = generateObjectId('content');

      const currentTitle = i === 0 ? args.title : `${args.title} (cont. ${i + 1})`;
      const currentContent = contentSlides[i];

      // Parse title and content for markdown formatting
      const titleSegments = parseMarkdownToFormattedText(currentTitle);
      const contentSegments = parseMarkdownToFormattedText(currentContent);

      // Calculate combined text for title and content
      const titleText = titleSegments.map((s) => s.text).join('');
      const contentText = contentSegments.map((s) => s.text).join('');

      // Calculate optimal font sizes
      const titleFontSize = calculateOptimalFontSize(
        titleText,
        LAYOUT_DIMENSIONS.TITLE.width,
        LAYOUT_DIMENSIONS.TITLE.height,
        FONT_SIZE_RANGES.TITLE
      );

      const contentFontSize = calculateOptimalFontSize(
        contentText,
        LAYOUT_DIMENSIONS.BODY.width,
        LAYOUT_DIMENSIONS.BODY.height,
        FONT_SIZE_RANGES.BODY
      );

      const requests: slides_v1.Schema$Request[] = [
        // Create the slide
        {
          createSlide: {
            objectId: slideObjectId,
            insertionIndex: slideIndex + i,
            slideLayoutReference: {
              predefinedLayout: layout,
            },
          },
        },
        // Create title text box
        {
          createShape: {
            objectId: titleObjectId,
            shapeType: 'TEXT_BOX',
            elementProperties: createElementProperties(
              slideObjectId,
              LAYOUT_DIMENSIONS.TITLE.x,
              LAYOUT_DIMENSIONS.TITLE.y,
              LAYOUT_DIMENSIONS.TITLE.width,
              LAYOUT_DIMENSIONS.TITLE.height
            ),
          },
        },
        // Insert title text
        {
          insertText: {
            objectId: titleObjectId,
            text: titleText,
            insertionIndex: 0,
          },
        },
        // Set default title font size and style
        {
          updateTextStyle: {
            objectId: titleObjectId,
            textRange: { type: 'ALL' },
            style: {
              fontSize: { magnitude: titleFontSize, unit: 'PT' },
              fontFamily: 'Arial',
              bold: true,
            },
            fields: 'fontSize,fontFamily,bold',
          },
        },
      ];

      // Add title formatting requests
      requests.push(...generateTextFormattingRequests(titleObjectId, titleSegments));

      // Only add content if layout supports it
      if (layout === 'TITLE_AND_BODY' || layout === 'BLANK') {
        requests.push(
          // Create content text box
          {
            createShape: {
              objectId: contentObjectId,
              shapeType: 'TEXT_BOX',
              elementProperties: createElementProperties(
                slideObjectId,
                LAYOUT_DIMENSIONS.BODY.x,
                LAYOUT_DIMENSIONS.BODY.y,
                LAYOUT_DIMENSIONS.BODY.width,
                LAYOUT_DIMENSIONS.BODY.height
              ),
            },
          },
          // Insert content text
          {
            insertText: {
              objectId: contentObjectId,
              text: contentText,
              insertionIndex: 0,
            },
          },
          // Set default content font size
          {
            updateTextStyle: {
              objectId: contentObjectId,
              textRange: { type: 'ALL' },
              style: {
                fontSize: { magnitude: contentFontSize, unit: 'PT' },
                fontFamily: 'Arial',
              },
              fields: 'fontSize,fontFamily',
            },
          }
        );

        // Add content formatting requests
        requests.push(...generateTextFormattingRequests(contentObjectId, contentSegments));
      }

      // Execute the batch update
      await slides.presentations.batchUpdate({
        presentationId: args.presentationId,
        requestBody: { requests },
      });

      createdSlides.push(slideObjectId);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              message: `Successfully created ${createdSlides.length} slide(s) with content`,
              slideIds: createdSlides,
              title: args.title,
              contentLength: args.content.length,
              splitIntoSlides: createdSlides.length > 1,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    throw handleGoogleApiError(error, 'create_slide_with_content');
  }
};
