'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * DataExportButton — triggers a LGPD right to access data export.
 *
 * AC #4: A "Exportar os meus dados" button visible on the profile settings section.
 * AC #5: Triggers browser download of the JSON file on success.
 * AC #9: Loading state while export is generating.
 *
 * Story 11.4 — LGPD Article 18, III: Right to confirmation and access to personal data.
 */
export function DataExportButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/profile/export');

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Limite de exportações excedido. Tente novamente em 1 hora.');
        } else {
          toast.error('Erro ao exportar dados. Tente novamente.');
        }
        return;
      }

      // Get the blob and trigger browser download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const contentDisposition = response.headers.get('content-disposition');
      const filename =
        contentDisposition
          ?.split('filename=')[1]
          ?.replace(/"/g, '') ?? 'mynewstyle-export.json';

      // Append to DOM before click for Firefox compatibility
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={isLoading}
      className="w-full sm:w-auto"
      aria-label="Exportar os meus dados"
    >
      {isLoading ? (
        <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4 mr-2" aria-hidden="true" />
      )}
      {isLoading ? 'A preparar exportação...' : 'Exportar os meus dados'}
    </Button>
  );
}
