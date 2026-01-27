export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-white/90 mb-2 animate-fade-in-down">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-gray-900 placeholder-gray-500 shadow-elevation-1 hover:shadow-elevation-2 hover:border-primary/70 ${
            error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {!error && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 focus-within:from-primary/5 focus-within:via-primary/0 focus-within:to-primary/5 transition-all duration-300 pointer-events-none" />
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-400 animate-fade-in-up font-medium flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}

