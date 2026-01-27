export default function Card({ children, className = '', hover = false, glow = false, ...props }) {
  return (
    <div
      className={`bg-dark-card/90 backdrop-blur-sm rounded-2xl border border-dark-border/50 p-5 sm:p-6 transition-all duration-300 relative overflow-hidden group ${
        hover ? 'hover:-translate-y-1.5 hover:border-primary/60 cursor-pointer hover:shadow-elevation-3' : ''
      } ${
        glow ? 'shadow-glow-primary hover:shadow-glow-lg' : 'shadow-elevation-2 hover:shadow-elevation-3'
      } ${className}`}
      {...props}
    >
      {glow && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        </>
      )}
      <div className="relative z-10">{children}</div>
      {hover && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/0 group-hover:to-primary/5 transition-all duration-300 pointer-events-none" />
      )}
    </div>
  )
}

