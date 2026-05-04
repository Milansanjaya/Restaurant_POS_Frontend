import toast from 'react-hot-toast';

type NotifyOptions = {
  title?: string;
  duration?: number;
  id?: string | number;
};

function ToastCard({ kind, title, message }: { kind: 'success' | 'error' | 'info'; title?: string; message: string }) {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  } as const;

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background: '#0f1724',
        color: '#e6eef8',
        padding: '12px 14px',
        borderRadius: 10,
        boxShadow: '0 6px 24px rgba(2,6,23,0.6)',
        minWidth: 260,
      }}
    >
      <div style={{ fontSize: 20 }}>{icons[kind]}</div>
      <div style={{ flex: 1 }}>
        {title ? <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div> : null}
        <div style={{ opacity: 0.95 }}>{message}</div>
      </div>
      <div style={{ marginLeft: 8 }} />
    </div>
  );
}

const notify = {
  success(message: string, opts?: NotifyOptions) {
    const title = opts?.title || 'Success';
    if (opts?.id) {
      return toast.success(message, { id: opts.id as any, duration: opts.duration ?? 3500 });
    }
    return toast.custom(() => <ToastCard kind="success" title={title} message={message} />, {
      duration: opts?.duration ?? 3500,
    });
  },
  error(message: string, opts?: NotifyOptions) {
    const title = opts?.title || 'Error';
    if (opts?.id) {
      return toast.error(message, { id: opts.id as any, duration: opts.duration ?? 4500 });
    }
    return toast.custom(() => <ToastCard kind="error" title={title} message={message} />, {
      duration: opts?.duration ?? 4500,
    });
  },
  info(message: string, opts?: NotifyOptions) {
    const title = opts?.title || 'Info';
    if (opts?.id) {
      return toast(message, { id: opts.id as any, duration: opts.duration ?? 3500 });
    }
    return toast.custom(() => <ToastCard kind="info" title={title} message={message} />, {
      duration: opts?.duration ?? 3500,
    });
  },
  loading(message: string) {
    return toast.loading(message);
  },
  dismiss(id?: string | number) {
    return toast.dismiss(id as any);
  },
};

export default notify;
