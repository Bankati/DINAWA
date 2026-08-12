'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';

export interface CommandPaletteItem {
  label: string;
  route: string;
  group?: string;
  icon?: React.ReactNode;
}

export interface CommandPaletteProps {
  items: CommandPaletteItem[];
  /** Contrôle externe (ex: clic sur la barre de recherche du topbar) — non fourni, le composant gère son propre état. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Ctrl+K / Cmd+K — cmdk gère le filtrage flou, on ne fournit que les items
// et la navigation. Monté une fois dans AppShell, agnostique du rôle (les
// items passés sont déjà filtrés par la nav du rôle courant).
export function CommandPalette({ items, open: openProp, onOpenChange }: CommandPaletteProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  const groups = items.reduce<Record<string, CommandPaletteItem[]>>((acc, item) => {
    const key = item.group ?? 'Navigation';
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Palette de commandes"
      className="fixed left-1/2 top-[18%] z-[100] w-full max-w-[560px] -translate-x-1/2 overflow-hidden rounded-2xl border border-ds-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95"
    >
      <div className="flex items-center gap-2.5 border-b border-ds-border px-4 py-3">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Command.Input
          placeholder="Rechercher une page, une action…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden sm:inline text-[10px] font-semibold text-muted-foreground border border-ds-border rounded px-1.5 py-0.5">Échap</kbd>
      </div>
      <Command.List className="max-h-[360px] overflow-y-auto p-2">
        <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
          Aucun résultat.
        </Command.Empty>
        {Object.entries(groups).map(([group, groupItems]) => (
          <Command.Group key={group} heading={group} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground">
            {groupItems.map((item) => (
              <Command.Item
                key={item.route}
                value={item.label}
                onSelect={() => {
                  router.push(item.route);
                  setOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-ds-secondary"
              >
                {item.icon}
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
