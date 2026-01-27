import { useRef } from 'react'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  ...props
}) {
  const buttonRef = useRef(null)
  
  const baseStyles = 'font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group'
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary via-primary-light to-primary text-white hover:from-primary-light hover:via-primary hover:to-primary-dark shadow-elevation-2 hover:shadow-elevation-3 focus:ring-primary active:scale-[0.98] hover:scale-[1.02]',
    secondary: 'bg-gradient-to-r from-primary-dark to-primary text-white hover:from-primary-darker hover:to-primary-dark shadow-elevation-2 hover:shadow-elevation-3 focus:ring-primary active:scale-[0.98] hover:scale-[1.02]',
    outline: 'border-2 border-primary/50 text-white hover:bg-primary/10 hover:border-primary focus:ring-primary active:scale-[0.98] hover:scale-[1.02] backdrop-blur-sm bg-dark-card/50',
    ghost: 'text-white hover:bg-primary/10 focus:ring-primary active:scale-[0.98]',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 shadow-elevation-2 hover:shadow-elevation-3 focus:ring-red-500 active:scale-[0.98] hover:scale-[1.02]',
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  const handleClick = (e) => {
    if (disabled) return
    
    // Create ripple effect
    const button = buttonRef.current
    if (button) {
      const rect = button.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      const ripple = document.createElement('span')
      ripple.style.position = 'absolute'
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`
      ripple.style.width = '0'
      ripple.style.height = '0'
      ripple.style.borderRadius = '50%'
      ripple.style.background = 'rgba(255, 255, 255, 0.4)'
      ripple.style.transform = 'translate(-50%, -50%)'
      ripple.style.animation = 'ripple 0.6s ease-out'
      ripple.style.pointerEvents = 'none'
      
      button.appendChild(ripple)
      
      setTimeout(() => {
        ripple.remove()
      }, 600)
    }
    
    if (onClick) onClick(e)
  }
  
  return (
    <button
      ref={buttonRef}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center">
        {children}
      </span>
      {variant === 'primary' && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      )}
    </button>
  )
}

