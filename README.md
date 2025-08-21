# Google Slides MCP Server

This project provides a Model Context Protocol (MCP) server for interacting with the Google Slides API. It allows you to create, read, and modify Google Slides presentations programmatically with advanced content formatting capabilities.

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm (usually comes with Node.js)
*   Google Cloud Project with the Google Slides API enabled.
*   OAuth 2.0 Credentials (Client ID and Client Secret) for your Google Cloud Project.
*   A Google Refresh Token associated with the OAuth 2.0 credentials and the necessary Google Slides API scopes.

## Setup

1.  **Clone the repository (if applicable) or ensure you are in the project directory.**

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Build the Server:**
    Compile the TypeScript code to JavaScript:
    ```bash
    npm run build
    ```
    This will create a `build` directory containing the compiled JavaScript code.

4.  **Obtain Google API Credentials:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project or select an existing one.
    *   Navigate to "APIs & Services" > "Enabled APIs & services".
    *   Click "+ ENABLE APIS AND SERVICES", search for "Google Slides API", and enable it.
    *   Navigate to "APIs & Services" > "Credentials".
    *   Click "+ CREATE CREDENTIALS" > "OAuth client ID".
    *   If prompted, configure the OAuth consent screen. For "User type", choose "External" unless you have a Google Workspace account and want to restrict it internally. Provide an app name, user support email, and developer contact information.
    *   On the "Scopes" page during consent screen setup, click "ADD OR REMOVE SCOPES". Search for and add the following scopes:
        *   `https://www.googleapis.com/auth/presentations` (To view and manage your presentations)
        *   *(Optional: Add `https://www.googleapis.com/auth/drive.readonly` or other Drive scopes if needed for specific operations like listing files, although not strictly required for basic Slides operations)*
    *   Save the consent screen configuration.
    *   Go back to "Credentials", click "+ CREATE CREDENTIALS" > "OAuth client ID".
    *   Select "Desktop app" as the Application type.
    *   Give it a name (e.g., "Slides MCP Client").
    *   Click "Create". You will see your **Client ID** and **Client Secret**. **Copy these down securely.** You can also download the JSON file containing these credentials.

5.  **Obtain a Google Refresh Token:**
    *   A refresh token allows the server to obtain new access tokens without requiring user interaction each time. Generating one typically involves a one-time authorization flow.
    *   You can use the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) for this:
        *   Go to the OAuth 2.0 Playground.
        *   Click the gear icon (Settings) in the top right.
        *   Check "Use your own OAuth credentials".
        *   Enter the **Client ID** and **Client Secret** you obtained in the previous step.
        *   In the "Step 1 - Select & authorize APIs" section on the left, find "Slides API v1" and select the `https://www.googleapis.com/auth/presentations` scope (and any other Drive scopes if you added them).
        *   Click "Authorize APIs".
        *   Sign in with the Google account you want the server to act on behalf of.
        *   Grant the requested permissions.
        *   You will be redirected back to the Playground. In "Step 2 - Exchange authorization code for tokens", you should see the **Refresh token** and Access token. **Copy the Refresh token securely.**

    Alternatively, you can use the provided `get-token` script to obtain a refresh token. This script will build the project and then run a utility that guides you through the OAuth flow to get a refresh token. Ensure your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured in your environment or a `.env` file if the script requires them (you may need to check the `src/getRefreshToken.ts` file for details on how it expects credentials). To run the script:

    ```bash
    npm run get-token
    ```

6.  **Configure Credentials and Command in MCP Settings:**
    Locate your MCP settings file (e.g., `.../User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`). Find or create the entry for `"google-slides-mcp"` and configure it with the command to run the server and your credentials:
    ```json
    "google-slides-mcp": {
      "transportType": "stdio",
      "command": "node",
      "args": [
        "/path/to/google-slides-mcp/build/index.js"
      ],
      "env": {
        "GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "GOOGLE_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN"
      }
      // ... other optional settings like description ...
    }
    ```
    Replace `/path/to/google-slides-mcp/build/index.js` with the actual path to the compiled server index file on your system. Replace `YOUR_CLIENT_ID`, `YOUR_CLIENT_SECRET`, and `YOUR_REFRESH_TOKEN` with the actual values you obtained. The MCP runner will inject these values into the server's environment when it starts.

## Running the Server

Execute the compiled code:

```bash
npm run start
```

The server will start and listen for MCP requests on standard input/output (stdio). You should see a message like: `Google Slides MCP server running and connected via stdio.`

## Available Tools

The server exposes the following tools via the Model Context Protocol:

### Content Creation Tools (Recommended)

These tools provide high-level, semantic operations with markdown support and automatic formatting:

*   **`create_slide_with_content`**: Creates a new slide with title and content, supporting markdown formatting and automatic text fitting.
    *   **Input:**
        *   `presentationId` (string, required): The ID of the presentation to add the slide to.
        *   `title` (string, required): The title of the slide (supports **bold**, *italic*, __underline__ markdown).
        *   `content` (string, required): The content of the slide (supports markdown formatting).
        *   `slideIndex` (integer, optional): The position where to insert the slide (0-based index).
        *   `layout` (string, optional): The slide layout - `TITLE_AND_BODY` (default), `TITLE_ONLY`, or `BLANK`.
    *   **Output:** JSON object with created slide details, including automatic content splitting if text is too long.
    *   **Features:**
        *   Markdown formatting support (**bold**, *italic*, __underline__)
        *   Automatic text fitting with optimal font sizes
        *   Content overflow handling (splits into multiple slides)
        *   Professional slide layouts

*   **`add_text_to_slide`**: Adds formatted text to an existing slide with markdown support and automatic text fitting.
    *   **Input:**
        *   `presentationId` (string, required): The ID of the presentation.
        *   `slideId` (string, required): The ID of the slide to add text to.
        *   `text` (string, required): The text to add (supports markdown formatting).
        *   `x` (number, optional): X position of the text box in points.
        *   `y` (number, optional): Y position of the text box in points.
        *   `width` (number, optional): Width of the text box in points.
        *   `height` (number, optional): Height of the text box in points.
        *   `fontSize` (number, optional): Font size in points (8-72).
        *   `autoFitText` (boolean, optional): Whether to auto-fit text to the text box (default: true).
        *   `textType` (string, optional): Text type for styling - `TITLE`, `BODY` (default), or `CAPTION`.
    *   **Output:** JSON object with text element details and formatting information.

*   **`add_list_to_slide`**: Adds a formatted list to an existing slide, supporting markdown list syntax.
    *   **Input:**
        *   `presentationId` (string, required): The ID of the presentation.
        *   `slideId` (string, required): The ID of the slide to add the list to.
        *   `listContent` (string, required): The list content in markdown format (`- item` for bullets, `1. item` for numbers).
        *   `x`, `y`, `width`, `height` (numbers, optional): Position and size in points.
        *   `bulletStyle` (string, optional): Bullet style - `BULLET_DISC_CIRCLE_SQUARE` (default), `NUMBERED_DECIMAL`, etc.
    *   **Output:** JSON object with list details and formatting information.
    *   **Features:**
        *   Nested list support with different bullet styles per level
        *   Automatic numbered and bulleted list detection
        *   Optimal font sizing for readability

*   **`add_table_to_slide`**: Adds a formatted table to an existing slide, supporting markdown table syntax.
    *   **Input:**
        *   `presentationId` (string, required): The ID of the presentation.
        *   `slideId` (string, required): The ID of the slide to add the table to.
        *   `tableContent` (string, required): The table in markdown format with `|` separators.
        *   `x`, `y`, `width`, `height` (numbers, optional): Position and size in points.
        *   `headerStyle` (boolean, optional): Whether to style the first row as headers (default: true).
    *   **Output:** JSON object with table details and formatting information.
    *   **Features:**
        *   GitHub-style markdown table support
        *   Automatic header row styling with background color
        *   Professional table borders and formatting
        *   Flexible positioning and sizing

### Basic Operations

*   **`create_presentation`**: Creates a new Google Slides presentation.
    *   **Input:**
        *   `title` (string, required): The title for the new presentation.
    *   **Output:** JSON object representing the created presentation details.

*   **`get_presentation`**: Retrieves details about an existing presentation.
    *   **Input:**
        *   `presentationId` (string, required): The ID of the presentation to retrieve.
        *   `fields` (string, optional): A field mask (e.g., "slides,pageSize") to limit the returned data.
    *   **Output:** JSON object representing the presentation details.

*   **`get_page`**: Retrieves details about a specific page (slide) within a presentation.
    *   **Input:**
        *   `presentationId` (string, required): The ID of the presentation containing the page.
        *   `pageObjectId` (string, required): The object ID of the page (slide) to retrieve.
    *   **Output:** JSON object representing the page details.

*   **`summarize_presentation`**: Extracts and formats all text content from a presentation for easier summarization.
    *   **Input:**
        *   `presentationId` (string, required): The ID of the presentation to summarize.
        *   `include_notes` (boolean, optional): Whether to include speaker notes in the summary. Defaults to false.
    *   **Output:** JSON object containing:
        *   `title`: The presentation's title
        *   `slideCount`: Total number of slides
        *   `lastModified`: Revision information
        *   `slides`: Array of slide objects containing:
            *   `slideNumber`: Position in presentation
            *   `slideId`: Object ID of the slide
            *   `content`: All text extracted from the slide
            *   `notes`: Speaker notes (if requested and available)

### Advanced Operations

*   **`batch_update_presentation`**: Applies a series of updates to a presentation. This is a low-level method for direct Google Slides API access when the high-level tools don't meet specific needs.
    *   **Input:**
        *   `presentationId` (string, required): The ID of the presentation to update.
        *   `requests` (array, required): An array of request objects defining the updates. Refer to the [Google Slides API `batchUpdate` documentation](https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate#requestbody) for the structure of individual requests.
        *   `writeControl` (object, optional): Controls write request execution (e.g., using revision IDs).
    *   **Output:** JSON object representing the result of the batch update.
    *   **Note:** For most use cases, prefer the specialized content creation tools above for better reliability and automatic formatting.

## Markdown Support

The content creation tools support the following markdown formatting:

*   **Bold text**: `**bold text**`
*   *Italic text*: `*italic text*`
*   __Underlined text__: `__underlined text__`
*   Bullet lists: `- item 1`, `- item 2`
*   Numbered lists: `1. item 1`, `2. item 2`
*   Nested lists: Use indentation (2 spaces per level)
*   Tables: GitHub-style with `|` separators and `---` header separators

Example markdown table:
```markdown
| Name | Age | City |
|------|-----|------|
| John | 25  | NYC  |
| Jane | 30  | LA   |
```

*(More tools can be added by extending `src/index.ts`)*
