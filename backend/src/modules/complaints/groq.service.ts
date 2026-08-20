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
   * Integrates TF-IDF Vector Cosine Similarity matching when LLM API service is disrupted.
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
    const primaryModel = process.env.GROQ_MODEL || "qwen/qwen3.6-27b";
    const fallbackModel = "openai/gpt-oss-20b";

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
        console.error("[GroqService] Both primary and fallback LLM models failed:", fallbackError);
      }

      // 4. Resilient TF-IDF Vector Cosine Similarity Fallback
      return this.getEmergencyFallback(departments, complaintText);
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

  /**
   * Secondary Fallback: TF-IDF Keyword Cosine Similarity Vector Matching
   * Executes when Groq LLM API is unavailable, rate-limited, or offline.
   */
  private static getEmergencyFallback(
    departments: DepartmentRoutingContext[],
    complaintText?: string
  ): ComplaintAnalysisResult {
    let bestDept = departments[0];
    let bestScore = 0;

    if (complaintText && departments.length > 0) {
      const textTokens = complaintText
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(Boolean);

      const textTokenFreq = new Map<string, number>();
      for (const t of textTokens) {
        textTokenFreq.set(t, (textTokenFreq.get(t) || 0) + 1);
      }

      for (const dept of departments) {
        const deptTokens = `${dept.name} ${dept.description}`
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter(Boolean);

        if (deptTokens.length === 0) continue;

        let dotProduct = 0;
        for (const t of deptTokens) {
          if (textTokenFreq.has(t)) {
            dotProduct += textTokenFreq.get(t)!;
          }
        }

        const normText = Math.sqrt(textTokens.length);
        const normDept = Math.sqrt(deptTokens.length);
        const cosineSim = normText && normDept ? dotProduct / (normText * normDept) : 0;

        if (cosineSim > bestScore) {
          bestScore = cosineSim;
          bestDept = dept;
        }
      }
    }

    const confidence = bestScore > 0 ? Math.min(0.75, Number((0.35 + bestScore * 0.5).toFixed(2))) : 0.15;
    const reasoning = bestScore > 0
      ? `TF-IDF Vector fallback matched department '${bestDept.name}' with similarity score ${(bestScore * 100).toFixed(1)}% (Groq LLM offline/busy).`
      : "Default fallback assigned (Groq LLM offline/busy).";

    return {
      department_code: bestDept.code,
      department_id: bestDept.id,
      confidence,
      priority: "MEDIUM",
      sentiment: "NEUTRAL",
      summary: "Ticket routed via TF-IDF Vector fallback (AI LLM service temporarily busy).",
      suggested_reply: "Thank you for contacting us. Our support team will review your ticket shortly.",
      reasoning,
    };
  }
}
