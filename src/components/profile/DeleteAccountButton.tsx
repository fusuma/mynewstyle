'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteAccountDialog } from './DeleteAccountDialog';

/**
 * DeleteAccountButton — trigger for LGPD right to deletion flow.
 *
 * AC #1: Red destructive button with trash icon:
 * "Eliminar a minha conta e todos os dados"
 * AC #2: Triggers confirmation dialog on click.
 */
export function DeleteAccountButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setIsDialogOpen(true)}
        className="w-full sm:w-auto"
        aria-label="Eliminar a minha conta e todos os dados"
      >
        <Trash2 className="size-4 mr-2" aria-hidden="true" />
        Eliminar a minha conta e todos os dados
      </Button>

      <DeleteAccountDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
