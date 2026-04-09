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
