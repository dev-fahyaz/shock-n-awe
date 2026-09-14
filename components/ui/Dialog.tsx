'use client';

import {
  Close,
  Content,
  Description,
  Overlay,
  Portal,
  Root,
  Title,
  Trigger,
} from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from 'react';

import { cn } from './utils';

/**
 * Kept API-compatible with `components/common/Dialog.tsx` in the website repo.
 *
 * Radix gives us the focus trap, escape handling, scroll lock and `aria-modal`
 * wiring — the parts of a modal that are tedious to get right and easy to get
 * subtly wrong.
 */

const Dialog = Root;
const DialogPortal = Portal;
const DialogTrigger = Trigger;
const DialogClose = Close;

const DialogOverlay = forwardRef<
  ElementRef<typeof Overlay>,
  ComponentPropsWithoutRef<typeof Overlay>
>(({ className, ...props }, ref) => (
  <Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/75 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-300 data-[state=closed]:duration-200',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = Overlay.displayName;

const DialogContent = forwardRef<
  ElementRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content> & {
    dismissable?: boolean;
    hideClose?: boolean;
  }
>(({ className, children, dismissable = true, hideClose = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <Content
      ref={ref}
      onInteractOutside={event => {
        if (!dismissable) event.preventDefault();
      }}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-white/10 bg-background p-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:duration-300 data-[state=closed]:duration-200 sm:rounded-2xl',
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Close>
      )}
    </Content>
  </DialogPortal>
));
DialogContent.displayName = Content.displayName;

const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = forwardRef<
  ElementRef<typeof Title>,
  ComponentPropsWithoutRef<typeof Title>
>(({ className, ...props }, ref) => (
  <Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = Title.displayName;

const DialogDescription = forwardRef<
  ElementRef<typeof Description>,
  ComponentPropsWithoutRef<typeof Description>
>(({ className, ...props }, ref) => (
  <Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
