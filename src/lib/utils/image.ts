/**
 * Converts an external image URL to a base64 data URL.
 * Required to avoid CORS failures when html-to-image captures external images
 * (e.g. AI preview images stored in Supabase Storage).
 * Returns the original URL if fetch fails — html-to-image will attempt its own inline.
 */
export async function toDataUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url); // fallback to original on error
      reader.readAsDataURL(blob);
    });
  } catch {
    return url; // fallback: let html-to-image try on its own
  }
}
