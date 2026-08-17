export function useAppTheme() {
  const theme = useCookie<'light' | 'dark'>('urpoint-theme', {
    default: () => 'light',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  const themeLabel = computed(() => theme.value === 'light' ? 'ธีมมืด' : 'ธีมสว่าง')

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  return {
    theme,
    themeLabel,
    toggleTheme,
  }
}
