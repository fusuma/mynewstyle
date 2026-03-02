import { createClient } from '@/lib/supabase/client';

export interface PhotoUploadResult {
  success: boolean;
  signedUrl?: string;
  storagePath?: string;
  error?: string;
}

const BUCKET = 'consultation-photos';
const SIGNED_URL_EXPIRY = 900; // 15 minutes in seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Uploads a compressed photo blob to Supabase Storage and returns a signed URL.
 *
 * Storage path pattern: {sessionId}/{consultationId}/original.jpg
 * Retries up to 2 times on network failures with 1-second delay.
 * Non-retryable errors (bucket not found, unauthorized) return immediately.
 */
export async function uploadPhoto(
  blob: Blob,
  sessionId: string,
  consultationId: string
): Promise<PhotoUploadResult> {
  const storagePath = `${sessionId}/${consultationId}/original.jpg`;
  const supabase = createClient();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        // Non-retryable errors: bucket not found, unauthorized
        if (
          uploadError.message?.includes('Bucket not found') ||
          uploadError.message?.includes('not authorized')
        ) {
          return { success: false, error: uploadError.message };
        }
        // Retryable: throw to trigger retry
        throw uploadError;
      }

      // Generate signed URL
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw signedUrlError || new Error('Failed to generate signed URL');
      }

      return {
        success: true,
        signedUrl: signedUrlData.signedUrl,
        storagePath,
      };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Upload failed';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  return { success: false, error: 'Upload failed after retries' };
}
