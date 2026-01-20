export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) {
  const baseStyles = 'font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary to-primary-light text-white hover:from-primary-dark hover:to-primary shadow-glow-primary hover:shadow-glow-lg focus:ring-primary transform hover:scale-105',
    secondary: 'bg-gradient-to-r from-primary-dark to-primary text-white hover:from-primary-darker hover:to-primary-dark shadow-glow-primary hover:shadow-glow-lg focus:ring-primary transform hover:scale-105',
    outline: 'border-2 border-primary text-white hover:bg-primary/20 hover:border-primary-light focus:ring-primary transform hover:scale-105 backdrop-blur-sm',
    ghost: 'text-white hover:bg-primary/20 focus:ring-primary',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 shadow-lg focus:ring-red-500 transform hover:scale-105',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

