export default function Card({ children, className = '', hover = false, glow = false, ...props }) {
  return (
    <div
      className={`bg-dark-card rounded-xl border border-dark-border p-4 sm:p-6 transition-all duration-300 relative overflow-hidden ${
        hover ? 'hover:-translate-y-1 hover:border-primary/50 cursor-pointer' : ''
      } ${
        glow ? 'shadow-glow-primary' : 'shadow-lg shadow-black/20'
      } ${className}`}
      {...props}
    >
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

