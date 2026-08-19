export function useAppTheme() {
  const themeCookie = useCookie<'light' | 'dark'>('urpoint-theme', {
    default: () => 'light',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  const theme = useState<'light' | 'dark'>('app-theme', () => themeCookie.value === 'dark' ? 'dark' : 'light')

  const themeLabel = computed(() => theme.value === 'light' ? 'ธีมมืด' : 'ธีมสว่าง')

  function applyTheme(next: 'light' | 'dark') {
    theme.value = next
    themeCookie.value = next
    if (import.meta.client) {
      document.documentElement.dataset.theme = next
    }
  }

  function toggleTheme() {
    applyTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function syncFromDocument() {
    if (!import.meta.client) {
      return
    }
    const next = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
    if (theme.value !== next) {
      theme.value = next
      themeCookie.value = next
    }
  }

  if (import.meta.client) {
    syncFromDocument()
    const win = window as Window & { __urpointThemeWatch?: boolean }
    if (!win.__urpointThemeWatch) {
      win.__urpointThemeWatch = true
      new MutationObserver(syncFromDocument).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      })
    }
  }

  useHead({
    htmlAttrs: {
      'data-theme': theme,
    },
  })

  return {
    theme,
    themeLabel,
    toggleTheme,
  }
}
