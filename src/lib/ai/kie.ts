/**
 * Kie.ai client module for preview generation via Nano Banana 2.
 *
 * This implements a SEPARATE PreviewProvider interface — NOT the existing AIProvider
 * interface — because preview generation is async (webhook-based) while face analysis
 * and consultation are synchronous request-response.
 *
 * Server-side only. KIE_API_KEY must never be exposed to the client bundle.
 */

export interface KieJobRequest {
  model: 'nano-banana-2';
  callBackUrl: string;
  input: {
    prompt: string;
    aspect_ratio: '3:4';
    resolution: '2K';
    output_format: 'jpg';
    google_search: false;
    image_input: string[];
  };
}

export interface KieJobResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface KieTaskResult {
  taskId: string;
}

/**
 * Error thrown when Kie.ai API returns a non-200 response.
 */
export class KieApiError extends Error {
  public readonly status: number;
  public readonly kieCode: number;

  constructor(message: string, status: number, kieCode: number) {
    super(message);
    this.name = 'KieApiError';
    this.status = status;
    this.kieCode = kieCode;
  }
}

/**
 * KieClient handles communication with the Kie.ai Nano Banana 2 API
 * for async hairstyle preview generation.
 *
 * Interaction model:
 * 1. Submit task via createPreviewTask -> receive taskId
 * 2. Kie.ai calls back to /api/webhook/kie when done (Story 7-2)
 * 3. Status can be polled via GET /api/preview/:id/status
 */
export class KieClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.kie.ai/api/v1';

  constructor() {
    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'KIE_API_KEY environment variable is required but not set. ' +
          'Add KIE_API_KEY to your .env.local file (server-side only).'
      );
    }
    this.apiKey = apiKey;
  }

  /**
   * Create a Kie.ai Nano Banana 2 preview task.
   *
   * Sends the user's photo URL and style prompt to Kie.ai, which processes
   * the request asynchronously and calls back to the provided webhook URL.
   *
   * @param photoUrl - Publicly accessible signed URL for the user's photo (15-min expiry)
   * @param stylePrompt - Style-specific prompt instructing AI to change only the hairstyle
   * @param callbackUrl - Webhook URL where Kie.ai will POST the completed result
   * @returns KieTaskResult containing the taskId for tracking
   * @throws KieApiError if Kie.ai returns a non-200 status
   */
  async createPreviewTask(
    photoUrl: string,
    stylePrompt: string,
    callbackUrl: string
  ): Promise<KieTaskResult> {
    const requestBody: KieJobRequest = {
      model: 'nano-banana-2',
      callBackUrl: callbackUrl,
      input: {
        prompt: stylePrompt,
        aspect_ratio: '3:4',
        resolution: '2K',
        output_format: 'jpg',
        google_search: false,
        image_input: [photoUrl],
      },
    };

    const response = await fetch(`${this.baseUrl}/jobs/createTask`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Attempt to parse JSON for structured error details, but gracefully handle
      // non-JSON responses (e.g., HTML error pages from proxies/CDN).
      let kieCode = response.status;
      let kieMsg = response.statusText;
      try {
        const errData = (await response.json()) as Partial<KieJobResponse>;
        kieCode = errData.code ?? response.status;
        kieMsg = errData.msg ?? response.statusText;
      } catch {
        // Non-JSON body — use HTTP status text as the message
      }
      throw new KieApiError(
        `Kie.ai API error: ${kieMsg} (code: ${kieCode})`,
        response.status,
        kieCode
      );
    }

    const responseData = (await response.json()) as KieJobResponse;

    return {
      taskId: responseData.data.taskId,
    };
  }
}
