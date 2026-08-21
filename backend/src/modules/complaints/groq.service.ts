import { groq } from "../../config/groq";

export interface DepartmentRoutingResult {
  selected_department: string;
  sentiment: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  suggested_reply: string;
  confidence: number;
}

export interface EmployeeRoutingResult {
  selected_employee_title: string;
  sentiment: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  suggested_reply: string;
  confidence: number;
}

export class GroqService {
  /**
   * DEPARTMENT ROUTING:
   * AI receives:
   * a) complaint title + complaint description in one text
   * b) all department names
   * c) nothing else
   *
   * AI returns:
   * a) selected department
   * b) sentiment analysis
   * c) priority (priority-based SLA)
   * d) response email suggestion
   * e) confidence score [0 to 1]
   * f) nothing else
   */
  static async classifyDepartmentRouting(
    complaintText: string,
    departmentNames: string[]
  ): Promise<DepartmentRoutingResult> {
    if (!departmentNames || departmentNames.length === 0) {
      throw new Error("No available departments for routing");
    }

    const model = process.env.GROQ_MODEL || "qwen/qwen3.6-27b";

    const response = await this.callGroqApiWithRetry(async () => {
      return await groq.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are an AI complaint classification system.

Analyze the customer's complaint and select the single most appropriate department to route it to from the list of available departments.

Available Departments:
${JSON.stringify(departmentNames, null, 2)}

Instructions:
- Select exactly one department from the available departments list.
- Analyze sentiment: HAPPY, NEUTRAL, FRUSTRATED, or ANGRY.
- Determine priority: LOW, MEDIUM, HIGH, or URGENT.
- Provide a professional response email suggestion.
- Assign a confidence score between 0.0 and 1.0.

Return only the structured JSON response according to the schema.`,
          },
          {
            role: "user",
            content: complaintText,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "department_routing",
            strict: true,
            schema: {
              type: "object",
              properties: {
                selected_department: {
                  type: "string",
                  enum: departmentNames,
                },
                sentiment: {
                  type: "string",
                  enum: ["HAPPY", "NEUTRAL", "FRUSTRATED", "ANGRY"],
                },
                priority: {
                  type: "string",
                  enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
                },
                suggested_reply: {
                  type: "string",
                },
                confidence: {
                  type: "number",
                },
              },
              required: [
                "selected_department",
                "sentiment",
                "priority",
                "suggested_reply",
                "confidence",
              ],
              additionalProperties: false,
            },
          },
        },
      });
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty response from Groq AI model");
    }

    const parsed = JSON.parse(rawContent);
    return {
      selected_department: parsed.selected_department,
      sentiment: parsed.sentiment,
      priority: parsed.priority,
      suggested_reply: parsed.suggested_reply,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    };
  }

  /**
   * EMPLOYEE ROUTING:
   * AI receives:
   * a) complaint title + complaint description in one text
   * b) all employee titles
   * c) nothing else
   *
   * AI returns:
   * a) selected employee title
   * b) sentiment analysis
   * c) priority (priority-based SLA)
   * d) response email suggestion
   * e) confidence score [0 to 1]
   * f) nothing else
   */
  static async classifyEmployeeRouting(
    complaintText: string,
    employeeTitles: string[]
  ): Promise<EmployeeRoutingResult> {
    if (!employeeTitles || employeeTitles.length === 0) {
      throw new Error("No available employee titles for routing");
    }

    const model = process.env.GROQ_MODEL || "qwen/qwen3.6-27b";

    const response = await this.callGroqApiWithRetry(async () => {
      return await groq.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are an AI complaint classification system.

Analyze the customer's complaint and select the single most appropriate employee title to route it to from the list of available employee titles.

Available Employee Titles:
${JSON.stringify(employeeTitles, null, 2)}

Instructions:
- Select exactly one employee title from the available employee titles list.
- Analyze sentiment: HAPPY, NEUTRAL, FRUSTRATED, or ANGRY.
- Determine priority: LOW, MEDIUM, HIGH, or URGENT.
- Provide a professional response email suggestion.
- Assign a confidence score between 0.0 and 1.0.

Return only the structured JSON response according to the schema.`,
          },
          {
            role: "user",
            content: complaintText,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "employee_routing",
            strict: true,
            schema: {
              type: "object",
              properties: {
                selected_employee_title: {
                  type: "string",
                  enum: employeeTitles,
                },
                sentiment: {
                  type: "string",
                  enum: ["HAPPY", "NEUTRAL", "FRUSTRATED", "ANGRY"],
                },
                priority: {
                  type: "string",
                  enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
                },
                suggested_reply: {
                  type: "string",
                },
                confidence: {
                  type: "number",
                },
              },
              required: [
                "selected_employee_title",
                "sentiment",
                "priority",
                "suggested_reply",
                "confidence",
              ],
              additionalProperties: false,
            },
          },
        },
      });
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty response from Groq AI model");
    }

    const parsed = JSON.parse(rawContent);
    return {
      selected_employee_title: parsed.selected_employee_title,
      sentiment: parsed.sentiment,
      priority: parsed.priority,
      suggested_reply: parsed.suggested_reply,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    };
  }

  /**
   * Exponential Backoff Retry Loop for Primary Model only (Handles HTTP 429 Rate Limits & 5xx Errors)
   */
  private static async callGroqApiWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await fn();
      } catch (error: any) {
        attempt++;
        const isRateLimit = error?.status === 429 || error?.statusCode === 429 || String(error?.message).includes("429");
        const isServerError = error?.status >= 500;

        if ((isRateLimit || isServerError) && attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt - 1) * 500 + Math.floor(Math.random() * 200);
          console.warn(`[GroqService] Rate limit / Server Error on primary model (Attempt ${attempt}/${maxRetries}). Retrying in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Groq AI request failed after ${maxRetries} retry attempts.`);
  }
}
