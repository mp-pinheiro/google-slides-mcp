# Google Slides MCP Server

Google Slides MCP Server is a TypeScript Node.js project that provides a Model Context Protocol (MCP) server for interacting with the Google Slides API. It enables programmatic creation, reading, and modification of Google Slides presentations through MCP tools.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Build
- Install Node.js v18 or later (project uses ES modules and Node.js APIs)
- Install dependencies: `npm install` -- takes ~15 seconds. NEVER CANCEL.
- Build the TypeScript code: `npm run build` -- takes ~10 seconds. NEVER CANCEL.
- The build creates a `build/` directory with compiled JavaScript files.

### Environment Setup (Required for Running)
Before running the server or token utility, you MUST set these environment variables:
- `GOOGLE_CLIENT_ID` - OAuth 2.0 client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - OAuth 2.0 client secret from Google Cloud Console  
- `GOOGLE_REFRESH_TOKEN` - Refresh token for accessing Google Slides API

Without these credentials, the server will exit immediately with an error message.

### Linting and Code Quality
- Run linting: `npm run lint` -- takes ~5 seconds. NEVER CANCEL.
- **CRITICAL**: The repository has existing formatting issues in `src/getRefreshToken.ts` that prevent clean linting. This is expected and does NOT indicate your changes broke anything.
- Auto-fix some linting issues: `npm run lint -- --fix`
- Always run linting before committing changes to ensure your code follows the project standards.

### Running the Server
- Start the MCP server: `npm run start` -- requires environment variables to be set
- The server runs as a stdio-based MCP server and will output: `Google Slides MCP server running and connected via stdio.`
- The server does NOT provide a web interface - it communicates through MCP protocol over stdin/stdout.

### Getting Google API Credentials
- Use the built-in token utility: `npm run get-token` -- builds project and runs OAuth flow
- This script opens a browser window for Google OAuth authentication
- Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to be set in environment
- Follow the setup instructions in README.md for complete Google Cloud Console configuration

## Validation

### Manual Validation Requirements
Since this project has no automated test suite, you MUST manually validate changes:

1. **Build validation**: Always ensure `npm run build` completes successfully after making changes
2. **Lint validation**: Run `npm run lint` and ensure no NEW errors are introduced (existing errors in getRefreshToken.ts are expected)
3. **Server startup validation**: Run `npm run start` with proper credentials to ensure the server starts without crashing
4. **Tool validation**: If modifying tools in `src/tools/`, manually test the tool functionality through an MCP client
5. **Schema validation**: If modifying `src/schemas.ts`, ensure tool arguments are properly validated

### Testing Changes to Core Components
- **Server handlers** (`src/serverHandlers.ts`): Test that all tools are properly registered and accessible
- **Tool implementations** (`src/tools/*.ts`): Test that tools execute successfully with valid arguments and handle errors gracefully  
- **Utility functions** (`src/utils/*.ts`): Test error handling and validation logic
- **Schema changes** (`src/schemas.ts`): Test that invalid arguments are properly rejected with clear error messages

### Environment Testing
Test the server behavior in these scenarios:
1. Missing credentials: Should exit with clear error message about required environment variables
2. Invalid credentials: Should fail gracefully when making Google API calls  
3. Valid credentials: Should start successfully and handle MCP requests

## Common Tasks

### Repository Structure
```
/home/runner/work/google-slides-mcp/google-slides-mcp/
├── .github/              # GitHub configuration (this file)
├── .gitignore           # Standard Node.js gitignore
├── .prettierrc          # Prettier formatting config
├── README.md            # Setup and usage documentation  
├── LICENSE              # GPLv3 license
├── eslint.config.js     # ESLint configuration
├── package.json         # Dependencies and scripts
├── package-lock.json    # Locked dependency versions
├── tsconfig.json        # TypeScript configuration
├── build/               # Compiled JavaScript (created by npm run build)
└── src/                 # TypeScript source code
    ├── index.ts         # Main MCP server entry point
    ├── getRefreshToken.ts # OAuth token utility (has known linting issues)
    ├── schemas.ts       # Zod validation schemas
    ├── serverHandlers.ts # MCP tool registration and request handling
    ├── tools/           # Tool implementations for Google Slides operations
    │   ├── createPresentation.ts      # Create new presentations
    │   ├── getPresentation.ts         # Get presentation details
    │   ├── batchUpdatePresentation.ts # Batch update operations  
    │   ├── getPage.ts                 # Get specific page details
    │   └── summarizePresentation.ts   # Summarize presentation content
    └── utils/           # Utility functions
        ├── envCheck.ts       # Environment variable validation
        ├── errorHandler.ts   # Google API error handling
        └── toolExecutor.ts   # Centralized tool execution logic
```

### Available npm Scripts
- `npm install` -- Install dependencies (~15 seconds)
- `npm run build` -- Compile TypeScript to JavaScript (~10 seconds)  
- `npm run start` -- Start the MCP server (requires environment variables)
- `npm run lint` -- Run ESLint on TypeScript files (~5 seconds)
- `npm run lint -- --fix` -- Auto-fix some linting issues
- `npm run get-token` -- Build and run OAuth token utility

### Key Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `googleapis` - Google APIs client library
- `zod` - Runtime type validation for tool arguments
- `typescript` - TypeScript compiler and tooling
- `eslint` + plugins - Code linting and formatting

### MCP Tools Available
The server provides these MCP tools for Google Slides manipulation:
1. `create_presentation` - Create new presentations with a title
2. `get_presentation` - Retrieve presentation details and structure
3. `batch_update_presentation` - Execute batch operations on presentations
4. `get_page` - Get specific page/slide details
5. `summarize_presentation` - Generate text summaries of presentation content

### Making Changes to Tools
When modifying or adding MCP tools:
1. Update or create tool implementation in `src/tools/`
2. Update schema definitions in `src/schemas.ts` if argument structure changes
3. Register the tool in `src/serverHandlers.ts`
4. Build and test the tool manually with proper credentials
5. Ensure error handling follows the pattern in existing tools

### Debug Information
- The server logs errors to stderr while maintaining MCP protocol communication on stdout
- Tool execution errors are wrapped in MCP error responses with appropriate error codes
- Environment variable validation happens on startup before server initialization
- Google API errors are caught and converted to MCP-compatible error responses

### Dependencies and Build Artifacts  
- `node_modules/` - npm dependencies (ignored by git)
- `build/` - Compiled JavaScript files (ignored by git, regenerated by npm run build)
- Dependency changes require `npm install` and typically `npm run build`
- Never commit `node_modules/` or `build/` directories

## CRITICAL Build and Timing Information

### Build Times and Timeouts
- **npm install**: ~15 seconds. Set timeout to 60+ seconds. NEVER CANCEL.
- **npm run build**: ~10 seconds. Set timeout to 30+ seconds. NEVER CANCEL.  
- **npm run lint**: ~5 seconds. Set timeout to 30+ seconds. NEVER CANCEL.
- **npm run get-token**: ~15 seconds + user interaction time. Set timeout to 300+ seconds for OAuth flow. NEVER CANCEL.

### Expected "Failures"
- `npm run lint` will show formatting errors in `src/getRefreshToken.ts` - this is EXPECTED and not caused by your changes
- `npm run start` without environment variables will exit immediately with error - this is EXPECTED behavior
- `npm run get-token` without environment variables will exit with error - this is EXPECTED behavior

These are not build failures but expected behavior when prerequisites are not met.

### Complete Validation Workflow Example
Follow this sequence to validate any changes you make:

```bash
# 1. Ensure dependencies are installed
npm install

# 2. Build the project - should complete without errors
npm run build

# 3. Check for NEW linting issues (ignore existing getRefreshToken.ts issues)
npm run lint

# 4. Verify server startup behavior - should show credential error message
npm run start

# 5. Test the build output exists
ls -la build/
ls -la build/tools/
ls -la build/utils/

# 6. If you modified schemas or tools, verify the compiled output looks correct
cat build/schemas.js
```

This complete sequence should take under 30 seconds total and validates that your changes integrate properly with the existing codebase.

**Measured timing for validation workflow:**
- `npm install` (when up to date): ~2-3 seconds
- `npm run build`: ~7-10 seconds  
- `npm run lint`: ~2-3 seconds
- `npm run start` (credential check): ~1-2 seconds
- File system checks: <1 second each
- **Total validation time: ~15-20 seconds**