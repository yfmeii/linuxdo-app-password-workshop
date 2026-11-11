import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { Toast, ToastClose, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';

export function Toaster({ notice }) {
  const Icon = notice?.tone === 'success' ? CircleCheck : notice?.tone === 'error' ? CircleAlert : Info;
  return (
    <ToastProvider key={notice?.id ?? 0} label="提示" swipeDirection="right">
      {notice && <Toast duration={notice.tone === 'success' ? 3000 : 7000} type={notice.tone === 'error' ? 'foreground' : 'background'}>
        <Icon className={`size-4 shrink-0 ${notice.tone === 'error' ? 'text-destructive' : 'text-primary'}`} aria-hidden="true" />
        <ToastTitle>{notice.message}</ToastTitle>
        <ToastClose />
      </Toast>}
      <ToastViewport label="提示（{hotkey}）" />
    </ToastProvider>
  );
}
