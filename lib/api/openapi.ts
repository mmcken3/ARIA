/**
 * ARIA OpenAPI 3.1 Specification
 *
 * Single source of truth for the API contract. Served at /api/docs via Scalar UI.
 * Keep this in sync with route handlers in app/api/.
 */

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "ARIA API",
    version: "0.1.0",
    description:
      "ARIA personal AI operating system — internal API. All routes require session authentication.",
  },
  servers: [{ url: "http://localhost:3000", description: "Local" }],
  // All routes require an active session cookie set by Better Auth after Google sign-in.
  // Authenticate via POST /api/auth/sign-in/social before calling any route.
  security: [{ cookieAuth: [] }],
  paths: {
    "/api/tasks": {
      get: {
        operationId: "listTasks",
        summary: "List tasks",
        tags: ["Tasks"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["backlog", "up_next", "in_progress", "done"] },
          },
          {
            name: "priority",
            in: "query",
            schema: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": {
            description: "Task list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskListResponse" },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        operationId: "createTask",
        summary: "Create task",
        tags: ["Tasks"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTask" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created task",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Task" } },
            },
          },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/tasks/{id}": {
      get: {
        operationId: "getTask",
        summary: "Get task",
        tags: ["Tasks"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Task",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
      patch: {
        operationId: "updateTask",
        summary: "Update task",
        tags: ["Tasks"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateTask" } },
          },
        },
        responses: {
          "200": {
            description: "Updated task",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } },
          },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        operationId: "deleteTask",
        summary: "Delete task",
        tags: ["Tasks"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Deleted" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
    },
    "/api/projects": {
      get: {
        operationId: "listProjects",
        summary: "List projects",
        tags: ["Projects"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "archived",
            in: "query",
            schema: { type: "boolean" },
            description: "Include archived projects",
          },
        ],
        responses: {
          "200": {
            description: "Project list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProjectListResponse" },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        operationId: "createProject",
        summary: "Create project",
        tags: ["Projects"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProject" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created project",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Project" } },
            },
          },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
          "409": { description: "Project name already exists" },
        },
      },
    },
    "/api/projects/{id}": {
      get: {
        operationId: "getProject",
        summary: "Get project",
        tags: ["Projects"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Project",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
      patch: {
        operationId: "updateProject",
        summary: "Update project",
        tags: ["Projects"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateProject" } },
          },
        },
        responses: {
          "200": {
            description: "Updated project",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } },
          },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
          "409": { description: "Project name already exists" },
        },
      },
      delete: {
        operationId: "deleteProject",
        summary: "Delete project",
        tags: ["Projects"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Deleted" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
    },
    "/api/chat": {
      post: {
        operationId: "sendChatMessage",
        summary: "Send a chat message",
        description:
          "Send a user message. Returns an NDJSON stream of events: `{type:'text',content:'...'}`, `{type:'tool',name:'...',result:{...}}`, `{type:'done'}`. The assistant response is persisted automatically.",
        tags: ["Chat"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", description: "User message text" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "NDJSON stream of StreamEvent objects",
            content: { "application/x-ndjson": { schema: { type: "string" } } },
          },
          "400": { description: "content is required" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/chat/messages": {
      get: {
        operationId: "getChatMessages",
        summary: "Get conversation history",
        description:
          "Returns the full message history for the user's single persistent conversation. Creates the conversation record on first call.",
        tags: ["Chat"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Conversation history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    conversationId: { type: "string" },
                    messages: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Message" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/memory": {
      get: {
        operationId: "listMemory",
        summary: "List AI memory entries",
        description: "Returns all persistent facts ARIA has remembered about the user.",
        tags: ["Memory"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Memory entries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    memory: {
                      type: "array",
                      items: { $ref: "#/components/schemas/MemoryEntry" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/memory/{id}": {
      delete: {
        operationId: "deleteMemory",
        summary: "Delete memory entry",
        tags: ["Memory"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "Deleted" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
    },
    "/api/integrations/status": {
      get: {
        operationId: "getIntegrationStatus",
        summary: "Get integration connection status",
        description:
          "Returns provider-grouped connection status. Each provider has one OAuth connection row; features (gcal, gmail) are derived from which scopes are present.",
        tags: ["Integrations"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Integration status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    connections: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ProviderConnection" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/integrations/connect": {
      get: {
        operationId: "connectIntegration",
        summary: "Initiate OAuth connect flow",
        description:
          "Redirects the user to Google's OAuth consent screen requesting all scopes for the given provider. Sets a short-lived state cookie for CSRF protection. On success, redirects to /settings?connected={provider}.",
        tags: ["Integrations"],
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "provider",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["google"] },
            description: "OAuth provider to connect",
          },
        ],
        responses: {
          "302": { description: "Redirect to Google OAuth consent screen" },
          "400": { description: "Unknown provider" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/integrations/callback": {
      get: {
        operationId: "integrationOAuthCallback",
        summary: "OAuth callback handler",
        description:
          "Receives the OAuth authorization code from Google, validates the state cookie, exchanges the code for tokens, upserts the integration_connections row, then redirects to /settings?connected={provider}. On error, redirects to /settings?connect_error={reason}.",
        tags: ["Integrations"],
        parameters: [
          { name: "code",  in: "query", schema: { type: "string" } },
          { name: "state", in: "query", schema: { type: "string" } },
          { name: "error", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "302": { description: "Redirect to /settings after token capture" },
          "302 (error)": { description: "Redirect to /settings?connect_error=... on failure" },
        },
      },
    },
    "/api/integrations/disconnect": {
      post: {
        operationId: "disconnectIntegration",
        summary: "Disconnect an integration provider",
        description:
          "Marks the integration_connections row as disconnected. Affects all features under that provider (e.g. disconnecting google disables both gcal and gmail). Background sync jobs will stop for this user until reconnected.",
        tags: ["Integrations"],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["provider"],
                properties: {
                  provider: { type: "string", enum: ["google"], description: "Provider to disconnect" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Disconnected",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                },
              },
            },
          },
          "400": { description: "provider required" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/dashboard": {
      get: {
        operationId: "getDashboardData",
        summary: "Get dashboard integration data",
        description:
          "Returns calendar events and important email messages for the dashboard. Only includes data for active, connected integrations. Calendar: next 5 upcoming events. Email: top 4 messages by relevance score (≥ 0.3).",
        tags: ["Dashboard"],
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Dashboard data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardResponse" },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/tasks/{id}/activity": {
      get: {
        operationId: "getTaskActivity",
        summary: "Get task activity",
        tags: ["Tasks"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Activity log",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    activity: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TaskActivity" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
    },
  },
  components: {
    schemas: {
      Task: {
        type: "object",
        required: ["id", "userId", "title", "status", "priority", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          status: { type: "string", enum: ["backlog", "up_next", "in_progress", "done"] },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          dueAt: { type: "string", format: "date-time", nullable: true },
          links: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                url: { type: "string", format: "uri" },
              },
            },
          },
          metadata: { type: "object", additionalProperties: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateTask: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: "string" },
          status: { type: "string", enum: ["backlog", "up_next", "in_progress", "done"], default: "backlog" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"], default: "medium" },
          dueAt: { type: "string", format: "date-time" },
          links: { type: "array", items: { type: "object" } },
          metadata: { type: "object" },
        },
      },
      UpdateTask: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: "string", nullable: true },
          status: { type: "string", enum: ["backlog", "up_next", "in_progress", "done"] },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          dueAt: { type: "string", format: "date-time", nullable: true },
          links: { type: "array", items: { type: "object" } },
          metadata: { type: "object" },
        },
      },
      TaskListResponse: {
        type: "object",
        properties: {
          tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } },
          total: { type: "integer" },
        },
      },
      Project: {
        type: "object",
        required: ["id", "userId", "name", "color", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          name: { type: "string" },
          color: { type: "string", description: "Hex color string" },
          archivedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateProject: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1 },
          color: { type: "string", description: "Hex color, e.g. #0D9488" },
        },
      },
      UpdateProject: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          color: { type: "string" },
          archivedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ProjectListResponse: {
        type: "object",
        properties: {
          projects: { type: "array", items: { $ref: "#/components/schemas/Project" } },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string" },
          conversationId: { type: "string" },
          role: { type: "string", enum: ["user", "assistant"] },
          content: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      MemoryEntry: {
        type: "object",
        required: ["id", "content", "createdAt"],
        properties: {
          id: { type: "string" },
          content: { type: "string", description: "The remembered fact" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CalendarAttendee: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
          name:  { type: "string", nullable: true },
          responseStatus: {
            type: "string",
            enum: ["accepted", "declined", "tentative", "needsAction"],
            nullable: true,
          },
        },
      },
      FeatureStatus: {
        type: "object",
        required: ["feature", "displayName", "hasScope"],
        properties: {
          feature:     { type: "string", enum: ["gcal", "gmail"], description: "Feature identifier" },
          displayName: { type: "string" },
          hasScope:    { type: "boolean", description: "Whether the required OAuth scope is present on the connection" },
        },
      },
      ProviderConnection: {
        type: "object",
        required: ["provider", "displayName", "connected", "features"],
        properties: {
          provider:     { type: "string", enum: ["google"], description: "OAuth provider identifier" },
          displayName:  { type: "string" },
          connected:    { type: "boolean", description: "True when an active connection row exists for this provider" },
          lastSyncedAt: { type: "string", format: "date-time", nullable: true },
          features: {
            type: "array",
            items: { $ref: "#/components/schemas/FeatureStatus" },
            description: "Individual feature capability status derived from granted OAuth scopes",
          },
        },
      },
      DashboardCalendarEvent: {
        type: "object",
        required: ["id", "title", "startAt", "endAt", "isAllDay", "attendeeCount", "status"],
        properties: {
          id:            { type: "string" },
          title:         { type: "string" },
          startAt:       { type: "string", format: "date-time" },
          endAt:         { type: "string", format: "date-time" },
          isAllDay:      { type: "boolean" },
          location:      { type: "string", nullable: true },
          attendeeCount: { type: "integer" },
          status:        { type: "string", enum: ["confirmed", "tentative", "cancelled"] },
        },
      },
      DashboardEmailMessage: {
        type: "object",
        required: ["id", "fromAddress", "subject", "isRead", "relevanceScore", "receivedAt"],
        properties: {
          id:             { type: "string" },
          fromName:       { type: "string", nullable: true },
          fromAddress:    { type: "string", format: "email" },
          subject:        { type: "string" },
          snippet:        { type: "string", nullable: true, description: "≤200 chars" },
          isRead:         { type: "boolean" },
          relevanceScore: { type: "number", minimum: 0, maximum: 1 },
          receivedAt:     { type: "string", format: "date-time" },
        },
      },
      DashboardResponse: {
        type: "object",
        required: ["calendar", "email"],
        properties: {
          calendar: {
            type: "object",
            properties: {
              connected: { type: "boolean" },
              events: {
                type: "array",
                items: { $ref: "#/components/schemas/DashboardCalendarEvent" },
                description: "Next 5 upcoming events, empty array when not connected",
              },
            },
          },
          email: {
            type: "object",
            properties: {
              connected: { type: "boolean" },
              messages: {
                type: "array",
                items: { $ref: "#/components/schemas/DashboardEmailMessage" },
                description: "Top 4 messages by relevance (score ≥ 0.3), empty array when not connected",
              },
            },
          },
        },
      },
      TaskActivity: {
        type: "object",
        properties: {
          id: { type: "string" },
          taskId: { type: "string" },
          type: { type: "string", enum: ["status_change", "comment", "ai_action", "link_added"] },
          body: { type: "string" },
          actor: { type: "string", enum: ["user", "system"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description:
          "Session cookie set by Better Auth after Google OAuth sign-in. All routes require this.",
      },
    },
  },
} as const;
