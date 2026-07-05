export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-screen-2xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#006B3F] flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 12h6m-3-3v6" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-display)' }}>VacFamily</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
          © {new Date().getFullYear()} VacFamily — Projeto TCC. Todos os direitos reservados.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600">Versão 0.1.0</p>
      </div>
    </footer>
  )
}
