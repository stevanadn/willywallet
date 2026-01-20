export default function Select({ label, error, options = [], className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-white mb-1.5">{label}</label>}
      <select
        className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-gray-900 ${
          error ? 'border-red-500 focus:ring-red-500' : 'hover:border-primary/50'
        } ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-white text-gray-900">
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-400 animate-fade-in font-medium">{error}</p>}
    </div>
  )
}

