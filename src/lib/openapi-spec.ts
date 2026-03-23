/**
 * OpenAPI 3.0 specification for the PetBorder Public API.
 * Do NOT import Zod or any internal implementation details here.
 */

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "PetBorder API",
    version: "1.0.0",
    description:
      "AI-powered pet travel compliance API for Australia. Generate DAFF-compliant timelines and look up country classifications.",
    contact: {
      name: "PetBorder Support",
      url: "https://petborder.com",
    },
  },
  servers: [
    {
      url: "https://api.petborder.com",
      description: "Production",
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "Bearer token in the format: `Bearer cpk_<32-hex-chars>`",
      },
    },
    schemas: {
      ApiSuccessResponse: {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: {
            type: "boolean",
            enum: [true],
          },
          data: {
            description: "The response payload",
          },
          meta: {
            type: "object",
            properties: {
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
            },
          },
        },
      },
      ApiErrorResponse: {
        type: "object",
        required: ["success", "error", "status"],
        properties: {
          success: {
            type: "boolean",
            enum: [false],
          },
          error: {
            type: "string",
            description: "Human-readable error message",
          },
          status: {
            type: "integer",
            description: "HTTP status code",
          },
        },
      },
      Country: {
        type: "object",
        required: ["code", "name", "group"],
        properties: {
          code: {
            type: "string",
            description: "ISO country code (e.g. US, GB, NZ)",
            example: "US",
          },
          name: {
            type: "string",
            description: "Country display name",
            example: "United States (mainland)",
          },
          group: {
            type: "integer",
            enum: [1, 2, 3],
            description:
              "DAFF group: 1=no quarantine, 2=10-day quarantine, 3=full RNATT process",
          },
          notes: {
            type: "string",
            description: "Optional notes about this country's classification",
          },
        },
      },
      TimelineInput: {
        type: "object",
        required: ["petType", "petBreed", "originCountry", "travelDate"],
        properties: {
          petType: {
            type: "string",
            enum: ["dog", "cat"],
            description: "Type of pet",
          },
          petBreed: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description: "Breed of the pet",
            example: "Labrador Retriever",
          },
          originCountry: {
            type: "string",
            description: "ISO country code of origin (use GET /api/v1/countries for valid codes)",
            example: "US",
          },
          travelDate: {
            type: "string",
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            description: "Desired travel date in YYYY-MM-DD format (must be in the future)",
            example: "2027-06-15",
          },
        },
      },
      EstimatedCost: {
        type: "object",
        required: ["description", "amountAUD"],
        properties: {
          description: { type: "string" },
          amountAUD: {
            type: "number",
            minimum: 0,
            description: "Cost in Australian dollars",
          },
          notes: { type: "string" },
        },
      },
      TimelineStep: {
        type: "object",
        required: [
          "stepNumber",
          "title",
          "description",
          "dueDate",
          "daysFromNow",
          "category",
          "isCompleted",
        ],
        properties: {
          stepNumber: { type: "integer", minimum: 1 },
          title: { type: "string" },
          description: { type: "string" },
          dueDate: {
            type: "string",
            description: "Date this step should be completed by (YYYY-MM-DD)",
          },
          daysFromNow: { type: "integer" },
          category: {
            type: "string",
            enum: ["vaccination", "testing", "documentation", "logistics", "quarantine"],
          },
          isCompleted: { type: "boolean" },
          estimatedCost: { $ref: "#/components/schemas/EstimatedCost" },
        },
      },
      TimelineWarning: {
        type: "object",
        required: ["severity", "message"],
        properties: {
          severity: {
            type: "string",
            enum: ["critical", "warning", "info"],
          },
          message: { type: "string" },
        },
      },
      TimelineOutput: {
        type: "object",
        required: [
          "steps",
          "warnings",
          "totalEstimatedCostAUD",
          "originGroup",
          "quarantineDays",
          "earliestTravelDate",
          "summary",
        ],
        properties: {
          steps: {
            type: "array",
            items: { $ref: "#/components/schemas/TimelineStep" },
            description: "Ordered list of compliance steps",
          },
          warnings: {
            type: "array",
            items: { $ref: "#/components/schemas/TimelineWarning" },
          },
          totalEstimatedCostAUD: {
            type: "number",
            minimum: 0,
            description: "Total estimated cost in AUD",
          },
          originGroup: {
            type: "integer",
            enum: [1, 2, 3],
            description: "DAFF group of the origin country",
          },
          quarantineDays: {
            type: "integer",
            minimum: 0,
            description: "Expected quarantine duration in days",
          },
          earliestTravelDate: {
            type: "string",
            description: "Earliest viable travel date given DAFF requirements (YYYY-MM-DD)",
          },
          summary: {
            type: "string",
            description: "Plain-English overview of the compliance journey",
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/timeline": {
      post: {
        summary: "Generate a DAFF compliance timeline",
        operationId: "generateTimeline",
        description:
          "Generates a personalised step-by-step DAFF compliance timeline for bringing a pet to Australia.",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TimelineInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Timeline generated successfully",
            headers: {
              "X-RateLimit-Limit": {
                schema: { type: "integer" },
                description: "Maximum requests per hour",
              },
              "X-RateLimit-Remaining": {
                schema: { type: "integer" },
                description: "Requests remaining in current window",
              },
              "X-RateLimit-Reset": {
                schema: { type: "integer" },
                description: "Unix timestamp when the rate limit window resets",
              },
            },
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/TimelineOutput" },
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Invalid JSON body",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid API key",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "422": {
            description: "Validation error (invalid input values)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            headers: {
              "Retry-After": {
                schema: { type: "integer" },
                description: "Seconds until the rate limit resets",
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "500": {
            description: "Internal server error (timeline generation failed)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/countries": {
      get: {
        summary: "List DAFF country classifications",
        operationId: "listCountries",
        description:
          "Returns all countries with their DAFF group classification. Use the country codes in the timeline generation endpoint.",
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "Country list returned successfully",
            headers: {
              "X-RateLimit-Limit": {
                schema: { type: "integer" },
              },
              "X-RateLimit-Remaining": {
                schema: { type: "integer" },
              },
              "X-RateLimit-Reset": {
                schema: { type: "integer" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccessResponse" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Country" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid API key",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
} as const;
