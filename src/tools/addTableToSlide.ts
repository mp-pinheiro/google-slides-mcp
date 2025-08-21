import { slides_v1 } from 'googleapis';
import { handleGoogleApiError } from '../utils/errorHandler.js';
import { parseMarkdownTable } from '../utils/markdownParser.js';
import {
  LAYOUT_DIMENSIONS,
  FONT_SIZE_RANGES,
  createElementProperties,
  generateObjectId,
} from '../utils/slideHelpers.js';

export interface AddTableToSlideArgs {
  presentationId: string;
  slideId: string;
  tableContent: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  headerStyle?: boolean;
}

/**
 * Adds a formatted table to an existing slide, supporting markdown table syntax.
 * @param slides The authenticated Google Slides API client.
 * @param args The arguments for adding the table.
 * @returns A promise resolving to the MCP response content.
 * @throws McpError if the Google API call fails.
 */
export const addTableToSlideTool = async (slides: slides_v1.Slides, args: AddTableToSlideArgs) => {
  try {
    const tableObjectId = generateObjectId('table');

    // Parse the table content
    const parsedTable = parseMarkdownTable(args.tableContent);

    if (!parsedTable) {
      throw new Error('Invalid table format. Please use markdown table syntax with | separators.');
    }

    const { headers, rows } = parsedTable;
    const totalRows = rows.length + 1; // +1 for header row
    const totalColumns = headers.length;

    if (totalColumns === 0 || totalRows === 0) {
      throw new Error('Table must have at least one column and one row');
    }

    // Use provided dimensions or defaults
    const x = args.x || LAYOUT_DIMENSIONS.BODY.x;
    const y = args.y || LAYOUT_DIMENSIONS.BODY.y;
    const width = args.width || LAYOUT_DIMENSIONS.BODY.width;
    const height = args.height || Math.min(LAYOUT_DIMENSIONS.BODY.height, totalRows * 40); // 40pt per row

    // Calculate column widths (equal distribution) - not currently used
    // const columnWidth = width / totalColumns;

    const requests: slides_v1.Schema$Request[] = [
      // Create the table
      {
        createTable: {
          objectId: tableObjectId,
          elementProperties: createElementProperties(args.slideId, x, y, width, height),
          rows: totalRows,
          columns: totalColumns,
        },
      },
    ];

    // Insert header text
    for (let col = 0; col < headers.length; col++) {
      if (headers[col]) {
        requests.push({
          insertText: {
            objectId: tableObjectId,
            cellLocation: { rowIndex: 0, columnIndex: col },
            text: headers[col],
            insertionIndex: 0,
          },
        });
      }
    }

    // Insert row data
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < totalColumns; col++) {
        const cellValue = rows[row][col] || '';
        if (cellValue) {
          requests.push({
            insertText: {
              objectId: tableObjectId,
              cellLocation: { rowIndex: row + 1, columnIndex: col },
              text: cellValue,
              insertionIndex: 0,
            },
          });
        }
      }
    }

    // Style the header row if requested (default: true)
    const headerStyle = args.headerStyle !== false;
    if (headerStyle) {
      // Make header row bold and slightly larger - style each cell individually
      for (let col = 0; col < totalColumns; col++) {
        requests.push({
          updateTextStyle: {
            objectId: tableObjectId,
            cellLocation: { rowIndex: 0, columnIndex: col },
            textRange: { type: 'ALL' },
            style: {
              bold: true,
              fontSize: { magnitude: FONT_SIZE_RANGES.TABLE.default + 2, unit: 'PT' },
              fontFamily: 'Arial',
            },
            fields: 'bold,fontSize,fontFamily',
          },
        });
      }

      // Add background color to header row
      requests.push({
        updateTableCellProperties: {
          objectId: tableObjectId,
          tableRange: {
            location: { rowIndex: 0, columnIndex: 0 },
            rowSpan: 1,
            columnSpan: totalColumns,
          },
          tableCellProperties: {
            tableCellBackgroundFill: {
              solidFill: {
                color: { rgbColor: { red: 0.9, green: 0.9, blue: 0.9 } }, // Light gray
              },
            },
          },
          fields: 'tableCellBackgroundFill',
        },
      });
    }

    // Style data cells - style each cell individually
    if (rows.length > 0) {
      for (let row = 1; row <= rows.length; row++) {
        for (let col = 0; col < totalColumns; col++) {
          requests.push({
            updateTextStyle: {
              objectId: tableObjectId,
              cellLocation: { rowIndex: row, columnIndex: col },
              textRange: { type: 'ALL' },
              style: {
                fontSize: { magnitude: FONT_SIZE_RANGES.TABLE.default, unit: 'PT' },
                fontFamily: 'Arial',
              },
              fields: 'fontSize,fontFamily',
            },
          });
        }
      }
    }

    // Add table borders
    requests.push({
      updateTableBorderProperties: {
        objectId: tableObjectId,
        tableRange: {
          location: { rowIndex: 0, columnIndex: 0 },
          rowSpan: totalRows,
          columnSpan: totalColumns,
        },
        borderPosition: 'ALL',
        tableBorderProperties: {
          tableBorderFill: {
            solidFill: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } }, // Black borders
          },
          weight: { magnitude: 1, unit: 'PT' },
          dashStyle: 'SOLID',
        },
        fields: 'tableBorderFill,weight,dashStyle',
      },
    });

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
              message: 'Successfully added table to slide',
              tableObjectId,
              slideId: args.slideId,
              dimensions: { rows: totalRows, columns: totalColumns },
              size: { width, height },
              position: { x, y },
              headerStyle,
              response: response.data,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    throw handleGoogleApiError(error, 'add_table_to_slide');
  }
};
