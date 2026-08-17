export type AppToastType = 'success' | 'error' | 'info' | 'warning'

export type AppToastItem = {
  id: string
  type: AppToastType
  title: string
  message: string
  duration: number
}

const DEFAULT_DURATION: Record<AppToastType, number> = {
  success: 4200,
  info: 3600,
  warning: 5200,
  error: 6400,
}

const DEFAULT_TITLE: Record<AppToastType, string> = {
  success: 'สำเร็จ',
  info: 'แจ้งเตือน',
  warning: 'โปรดตรวจสอบ',
  error: 'เกิดข้อผิดพลาด',
}

export function useAppToast() {
  const toasts = useState<AppToastItem[]>('app:toasts', () => [])

  function dismiss(id: string) {
    toasts.value = toasts.value.filter(item => item.id !== id)
  }

  function push(input: {
    type: AppToastType
    message: string
    title?: string
    duration?: number
  }) {
    const id = crypto.randomUUID()
    const type = input.type
    const duration = input.duration ?? DEFAULT_DURATION[type]
    const toast: AppToastItem = {
      id,
      type,
      title: input.title ?? DEFAULT_TITLE[type],
      message: input.message,
      duration,
    }

    toasts.value = [...toasts.value, toast].slice(-4)

    if (import.meta.client && duration > 0) {
      window.setTimeout(() => dismiss(id), duration)
    }

    return id
  }

  return {
    toasts,
    dismiss,
    push,
    success(message: string, title?: string) {
      return push({ type: 'success', message, title })
    },
    error(message: string, title?: string) {
      return push({ type: 'error', message, title })
    },
    info(message: string, title?: string) {
      return push({ type: 'info', message, title })
    },
    warning(message: string, title?: string) {
      return push({ type: 'warning', message, title })
    },
  }
}
