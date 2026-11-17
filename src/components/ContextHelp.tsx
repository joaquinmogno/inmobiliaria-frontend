import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

export default function ContextHelp({ label, children }: { label: string; children: ReactNode }) {
  return <Popover className="inline-flex shrink-0 print:hidden">
    <PopoverButton type="button" aria-label={label} className="inline-flex min-h-[var(--ui-control-height)] min-w-[var(--ui-control-height)] items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
      <InformationCircleIcon className="h-5 w-5" aria-hidden="true" />
    </PopoverButton>
    <PopoverPanel anchor="bottom end" role="region" aria-label={label} className="z-[110] print:hidden w-80 max-h-[var(--anchor-max-height)] max-w-[calc(100vw-2rem)] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-sm font-normal leading-relaxed text-slate-700 shadow-lg [--anchor-gap:0.5rem] [--anchor-padding:1rem]">
      {children}
    </PopoverPanel>
  </Popover>;
}
