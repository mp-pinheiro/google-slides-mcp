import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { slides_v1 } from 'googleapis';
import {
  CreatePresentationArgsSchema,
  GetPresentationArgsSchema,
  BatchUpdatePresentationArgsSchema,
  GetPageArgsSchema,
  SummarizePresentationArgsSchema,
  CreateSlideWithContentArgsSchema,
  AddTextToSlideArgsSchema,
  AddListToSlideArgsSchema,
  AddTableToSlideArgsSchema,
} from './schemas.js';
import { createPresentationTool } from './tools/createPresentation.js';
import { getPresentationTool } from './tools/getPresentation.js';
import { batchUpdatePresentationTool } from './tools/batchUpdatePresentation.js';
import { getPageTool } from './tools/getPage.js';
import { summarizePresentationTool } from './tools/summarizePresentation.js';
import { createSlideWithContentTool } from './tools/createSlideWithContent.js';
import { addTextToSlideTool } from './tools/addTextToSlide.js';
import { addListToSlideTool } from './tools/addListToSlide.js';
import { addTableToSlideTool } from './tools/addTableToSlide.js';
import { executeTool } from './utils/toolExecutor.js';

export const setupToolHandlers = (server: Server, slides: slides_v1.Slides) => {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'create_presentation',
        description: 'Create a new Google Slides presentation',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the presentation.',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_presentation',
        description: 'Get details about a Google Slides presentation',
        inputSchema: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'string',
              description: 'The ID of the presentation to retrieve.',
            },
            fields: {
              type: 'string',
              description:
                'Optional. A mask specifying which fields to include in the response (e.g., "slides,pageSize").',
            },
          },
          required: ['presentationId'],
        },
      },
      {
        name: 'batch_update_presentation',
        description: 'Apply a batch of updates to a Google Slides presentation',
        inputSchema: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'string',
              description: 'The ID of the presentation to update.',
            },
            requests: {
              type: 'array',
              description:
                'A list of update requests to apply. See Google Slides API documentation for request structures.',
              items: { type: 'object' },
            },
            writeControl: {
              type: 'object',
              description: 'Optional. Provides control over how write requests are executed.',
              properties: {
                requiredRevisionId: { type: 'string' },
                targetRevisionId: { type: 'string' },
              },
            },
          },
          required: ['presentationId', 'requests'],
        },
      },
      {
        name: 'get_page',
        description: 'Get details about a specific page (slide) in a presentation',
        inputSchema: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'string',
              description: 'The ID of the presentation.',
            },
            pageObjectId: {
              type: 'string',
              description: 'The object ID of the page (slide) to retrieve.',
            },
          },
          required: ['presentationId', 'pageObjectId'],
        },
      },
      {
        name: 'summarize_presentation',
        description: 'Extract text content from all slides in a presentation for summarization purposes',
        inputSchema: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'string',
              description: 'The ID of the presentation to summarize.',
            },
            include_notes: {
              type: 'boolean',
              description: 'Optional. Whether to include speaker notes in the summary (default: false).',
            },
          },
          required: ['presentationId'],
        },
      },
      {
        name: 'create_slide_with_content',
        description: 'Create a new slide with title and content, supporting markdown formatting and automatic text fitting',
        inputSchema: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'string',
              description: 'The ID of the presentation to add the slide to.',
            },
            title: {
              type: 'string',
              description: 'The title of the slide (supports markdown formatting).',
            },
            content: {
              type: 'string',
              description: 'The content of the slide (supports markdown formatting).',
            },
            slideIndex: {
              type: 'integer',
              description: 'Optional. The position where to insert the slide (0-based index).',
            },
            layout: {
              type: 'string',
              enum: ['TITLE_AND_BODY', 'TITLE_ONLY', 'BLANK'],
              description: 'Optional. The slide layout (default: TITLE_AND_BODY).',
            },
          },
          required: ['presentationId', 'title', 'content'],
        },
      },
      {
        name: 'add_text_to_slide',
        description: 'Add formatted text to an existing slide with markdown support and automatic text fitting',
        inputSchema: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'string',
              description: 'The ID of the presentation.',
            },
            slideId: {
              type: 'string',
              description: 'The ID of the slide to add text to.',
            },
            text: {
              type: 'string',
              description: 'The text to add (supports markdown formatting).',
            },
            x: {
              type: 'number',
              description: 'Optional. X position of the text box in points.',
            },
            y: {
              type: 'number',
              description: 'Optional. Y position of the text box in points.',
            },
            width: {
              type: 'number',
              description: 'Optional. Width of the text box in points.',
            },
            height: {
              type: 'number',
              description: 'Optional. Height of the text box in points.',
            },
            fontSize: {
              type: 'number',
              minimum: 8,
              maximum: 72,
              description: 'Optional. Font size in points (8-72).',
            },
            autoFitText: {
              type: 'boolean',
              description: 'Optional. Whether to auto-fit text to the text box (default: true).',
            },
            textType: {
              type: 'string',
              enum: ['TITLE', 'BODY', 'CAPTION'],
              description: 'Optional. The type of text for default styling (default: BODY).',
            },
          },
          required: ['presentationId', 'slideId', 'text'],
        },
      },
      {
        name: 'add_list_to_slide',
        description: 'Add a formatted list to an existing slide, supporting markdown list syntax',
        inputSchema: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'string',
              description: 'The ID of the presentation.',
            },
            slideId: {
              type: 'string',
              description: 'The ID of the slide to add the list to.',
            },
            listContent: {
              type: 'string',
              description: 'The list content in markdown format (- for bullets, 1. for numbers).',
            },
            x: {
              type: 'number',
              description: 'Optional. X position of the list in points.',
            },
            y: {
              type: 'number',
              description: 'Optional. Y position of the list in points.',
            },
            width: {
              type: 'number',
              description: 'Optional. Width of the list area in points.',
            },
            height: {
              type: 'number',
              description: 'Optional. Height of the list area in points.',
            },
            bulletStyle: {
              type: 'string',
              enum: ['BULLET_DISC_CIRCLE_SQUARE', 'BULLET_CIRCLE_HOLLOW', 'BULLET_DIAMOND_X', 'NUMBERED_DECIMAL', 'NUMBERED_ALPHA_LOWER'],
              description: 'Optional. The bullet style to use.',
            },
          },
          required: ['presentationId', 'slideId', 'listContent'],
        },
      },
      {
        name: 'add_table_to_slide',
        description: 'Add a formatted table to an existing slide, supporting markdown table syntax',
        inputSchema: {
          type: 'object',
          properties: {
            presentationId: {
              type: 'string',
              description: 'The ID of the presentation.',
            },
            slideId: {
              type: 'string',
              description: 'The ID of the slide to add the table to.',
            },
            tableContent: {
              type: 'string',
              description: 'The table content in markdown format with | separators.',
            },
            x: {
              type: 'number',
              description: 'Optional. X position of the table in points.',
            },
            y: {
              type: 'number',
              description: 'Optional. Y position of the table in points.',
            },
            width: {
              type: 'number',
              description: 'Optional. Width of the table in points.',
            },
            height: {
              type: 'number',
              description: 'Optional. Height of the table in points.',
            },
            headerStyle: {
              type: 'boolean',
              description: 'Optional. Whether to style the first row as headers (default: true).',
            },
          },
          required: ['presentationId', 'slideId', 'tableContent'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'create_presentation':
        return executeTool(slides, name, args, CreatePresentationArgsSchema, createPresentationTool);
      case 'get_presentation':
        return executeTool(slides, name, args, GetPresentationArgsSchema, getPresentationTool);
      case 'batch_update_presentation':
        return executeTool(slides, name, args, BatchUpdatePresentationArgsSchema, batchUpdatePresentationTool);
      case 'get_page':
        return executeTool(slides, name, args, GetPageArgsSchema, getPageTool);
      case 'summarize_presentation':
        return executeTool(slides, name, args, SummarizePresentationArgsSchema, summarizePresentationTool);
      case 'create_slide_with_content':
        return executeTool(slides, name, args, CreateSlideWithContentArgsSchema, createSlideWithContentTool);
      case 'add_text_to_slide':
        return executeTool(slides, name, args, AddTextToSlideArgsSchema, addTextToSlideTool);
      case 'add_list_to_slide':
        return executeTool(slides, name, args, AddListToSlideArgsSchema, addListToSlideTool);
      case 'add_table_to_slide':
        return executeTool(slides, name, args, AddTableToSlideArgsSchema, addTableToSlideTool);
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool requested: ${name}` }],
          isError: true,
          errorCode: ErrorCode.MethodNotFound,
        };
    }
  });
};
