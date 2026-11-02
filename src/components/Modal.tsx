import { Fragment, type ComponentProps } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, Transition } from '@headlessui/react';

export function Modal({ open, ...props }: ComponentProps<typeof Dialog<'div'>>) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog {...props} />
    </Transition>
  );
}

export function ModalBackdrop({ className, ...props }: ComponentProps<typeof DialogBackdrop<'div'>>) {
  return <DialogBackdrop {...props} transition className={typeof className === 'function'
    ? state => `ui-modal-backdrop ${className(state)}`
    : `ui-modal-backdrop ${className || ''}`} />;
}

export function ModalPanel({ className, ...props }: ComponentProps<typeof DialogPanel<'div'>>) {
  return <DialogPanel {...props} transition className={typeof className === 'function'
    ? state => `ui-modal-panel ${className(state)}`
    : `ui-modal-panel ${className || ''}`} />;
}
