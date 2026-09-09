/* Japanese Writing Studio — apply persisted theme before first paint.
   External file (CSP-safe: script-src 'self' blocks inline scripts). */
(function () {
  try {
    var stored = window.localStorage.getItem('jws.theme')
    var theme =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark'
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    document.documentElement.dataset.theme = theme
  } catch {
    document.documentElement.dataset.theme = 'dark'
  }
})()