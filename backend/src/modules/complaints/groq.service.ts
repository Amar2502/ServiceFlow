import { groq } from "../../config/groq";
import { z } from "zod";

export interface DepartmentRoutingContext {
  id: string;          // Database UUID
  code: string;        // Clean department slug e.g. "billing"
  name: string;        // Department display name e.g. "Billing & Payments"
  description: string; // Keywords/Description for zero-shot LLM matching
}

export const ComplaintAnalysisSchema = z.object({
  department_code: z.string(),
  confidence: z.number().min(0).max(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  sentiment: z.enum(["HAPPY", "NEUTRAL", "FRUSTRATED", "ANGRY"]),
  summary: z.string(),
  suggested_reply: z.string(),
  reasoning: z.string(),
});

export type ComplaintAnalysisResult = z.infer<typeof ComplaintAnalysisSchema> & {
  department_id: string; // Resolved database UUID
};

export class GroqService {
  /**
   * Multi-Task Ticket Routing & Classification using Groq SDK json_schema mode
   * with Exponential Backoff Retries & Resilient Model Fallbacks for HTTP 429 Rate Limits.
   */
  static async classifyComplaint(
    complaintText: string,
    departments: DepartmentRoutingContext[]
  ): Promise<ComplaintAnalysisResult> {
    if (!departments || departments.length === 0) {
      throw new Error("No available departments for routing");
    }

    // 1. Map codes to UUIDs for anti-hallucination resolution
    const deptCodeToUuidMap = new Map<string, string>();
    const promptDeptList = departments.map((d) => {
      const code = d.code.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      deptCodeToUuidMap.set(code, d.id);
      return {
        department_code: code,
        name: d.name,
        description: d.description || d.name,
      };
    });

    const validDepartmentCodes = Array.from(deptCodeToUuidMap.keys());
    const primaryModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
    const fallbackModel = "llama-3.3-70b-versatile";

    // 2. Attempt primary model with Exponential Backoff Retries (handles HTTP 429)
    try {
      const response = await this.callGroqApiWithRetry(
        primaryModel,
        complaintText,
        promptDeptList,
        validDepartmentCodes
      );

      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error("Empty response from Groq API");
      }

      const rawJson = JSON.parse(rawContent);
      const validated = ComplaintAnalysisSchema.parse(rawJson);
      const resolvedUuid = deptCodeToUuidMap.get(validated.department_code.toLowerCase()) || departments[0].id;

      return {
        ...validated,
        department_code: validated.department_code,
        department_id: resolvedUuid,
      };
    } catch (primaryError) {
      console.warn(`[GroqService] Primary model (${primaryModel}) failed or rate-limited. Trying fallback model (${fallbackModel})...`, primaryError);

      // 3. Fallback to secondary model with Exponential Backoff Retries
      try {
        const response = await this.callGroqApiWithRetry(
          fallbackModel,
          complaintText,
          promptDeptList,
          validDepartmentCodes
        );

        const rawContent = response.choices[0]?.message?.content;
        if (rawContent) {
          const rawJson = JSON.parse(rawContent);
          const validated = ComplaintAnalysisSchema.parse(rawJson);
          const resolvedUuid = deptCodeToUuidMap.get(validated.department_code.toLowerCase()) || departments[0].id;

          return {
            ...validated,
            department_code: validated.department_code,
            department_id: resolvedUuid,
          };
        }
      } catch (fallbackError) {
        console.error("[GroqService] Both primary and fallback models failed:", fallbackError);
      }

      // 4. Safe Emergency Fallback
      return this.getEmergencyFallback(departments);
    }
  }

  /**
   * Executive Exponential Backoff Retry Loop (Handles HTTP 429 Too Many Requests & 5xx Errors)
   */
  private static async callGroqApiWithRetry(
    model: string,
    complaintText: string,
    promptDeptList: { department_code: string; name: string; description: string }[],
    validDepartmentCodes: string[],
    maxRetries = 3
  ) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await this.callGroqApi(model, complaintText, promptDeptList, validDepartmentCodes);
      } catch (error: any) {
        attempt++;
        const isRateLimit = error?.status === 429 || error?.statusCode === 429 || String(error?.message).includes("429");
        const isServerError = error?.status >= 500;

        if ((isRateLimit || isServerError) && attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms, 2000ms + random jitter
          const backoffMs = Math.pow(2, attempt - 1) * 500 + Math.floor(Math.random() * 200);
          console.warn(`[GroqService] Rate limit / Server Error on ${model} (Attempt ${attempt}/${maxRetries}). Retrying in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Model ${model} failed after ${maxRetries} retry attempts.`);
  }

  private static async callGroqApi(
    model: string,
    complaintText: string,
    promptDeptList: { department_code: string; name: string; description: string }[],
    validDepartmentCodes: string[]
  ) {
    return await groq.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: `You are an AI complaint classification system.

Analyze the customer's complaint and classify it accurately into one of the available departments.

Available Departments:
${JSON.stringify(promptDeptList, null, 2)}

Return only the structured JSON response.`,
        },
        {
          role: "user",
          content: complaintText,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "complaint_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              department_code: {
                type: "string",
                enum: validDepartmentCodes,
              },
              confidence: {
                type: "number",
              },
              priority: {
                type: "string",
                enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
              },
              sentiment: {
                type: "string",
                enum: ["HAPPY", "NEUTRAL", "FRUSTRATED", "ANGRY"],
              },
              summary: {
                type: "string",
              },
              suggested_reply: {
                type: "string",
              },
              reasoning: {
                type: "string",
              },
            },
            required: [
              "department_code",
              "confidence",
              "priority",
              "sentiment",
              "summary",
              "suggested_reply",
              "reasoning",
            ],
            additionalProperties: false,
          },
        },
      },
    });
  }

  private static getEmergencyFallback(departments: DepartmentRoutingContext[]): ComplaintAnalysisResult {
    const defaultDept = departments[0];
    return {
      department_code: defaultDept.code,
      department_id: defaultDept.id,
      confidence: 0.1,
      priority: "MEDIUM",
      sentiment: "NEUTRAL",
      summary: "Manual triage required (AI service temporarily unavailable).",
      suggested_reply: "Thank you for contacting us. Customer support will review your issue shortly.",
      reasoning: "Fallback assigned due to AI service disruption.",
    };
  }
}
