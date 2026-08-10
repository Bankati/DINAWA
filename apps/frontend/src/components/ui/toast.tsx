'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

// Remplace les alert()/confirm() bruts du navigateur (ex: archive() dans
// dashboard/biens) par un feedback visuel cohérent avec la charte WARAH.
// <Toaster /> ne se monte qu'une fois, dans le layout racine.
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      toastOptions={{ style: { borderRadius: '10px', fontSize: '13.5px' } }}
    />
  );
}

export { toast };
