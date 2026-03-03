'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * DeleteAccountDialog — LGPD right to deletion confirmation dialog.
 *
 * AC #2: Shows irreversible warning with Portuguese text.
 * AC #6: Requires user to type "ELIMINAR" to enable the confirm button.
 * AC #5: On success, signs out and redirects to / with success toast.
 * AC #7: On error, shows error toast and closes dialog.
 */
export function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmEnabled = confirmText === 'ELIMINAR';

  const handleConfirm = async () => {
    if (!isConfirmEnabled) return;

    setIsDeleting(true);

    try {
      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[DeleteAccountDialog] API error:', errorData);
        throw new Error(errorData.error ?? 'Deletion failed');
      }

      // Sign out locally to clear session tokens
      const supabase = createClient();
      await supabase.auth.signOut();

      // Redirect to landing page with success param (AC #5)
      router.push('/?deleted=true');
    } catch (error) {
      console.error('[DeleteAccountDialog] Error during deletion:', error);
      toast.error('Erro ao eliminar conta. Tente novamente ou contacte o suporte.');
      setIsDeleting(false);
      onClose();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isDeleting) {
      setConfirmText('');
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar conta permanentemente</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Esta acao e irreversivel. Todos os seus dados, incluindo fotos, consultorias e
                previews serao permanentemente eliminados.
              </p>
              <p className="text-sm font-medium text-foreground mb-2">
                Para confirmar, escreva <strong>ELIMINAR</strong> no campo abaixo:
              </p>
              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ELIMINAR"
                disabled={isDeleting}
                aria-label="Confirmacao de eliminacao"
                className="mt-1"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isDeleting}
          >
            {isDeleting ? 'A eliminar...' : 'Confirmar eliminacao'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
