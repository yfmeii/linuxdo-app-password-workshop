import * as React from 'react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport ref={ref} data-slot="toast-viewport" className={cn(
    'fixed inset-x-0 top-0 z-[100] mx-auto flex max-h-screen w-full max-w-[420px] list-none flex-col gap-2 p-4 outline-none', className,
  )} {...props} />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Root ref={ref} data-slot="toast" className={cn(
    'pointer-events-auto relative flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-foreground shadow-lg data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none', className,
  )} {...props} />
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn('min-w-0 flex-1 text-xs leading-6', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Close ref={ref} aria-label="关闭提示" className={cn(
    'flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', className,
  )} {...props}>
    <X className="size-3.5" aria-hidden="true" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastClose };
