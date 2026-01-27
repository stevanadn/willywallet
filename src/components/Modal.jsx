import { X } from 'lucide-react'
import { useEffect } from 'react'

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`bg-dark-card/95 backdrop-blur-xl border border-dark-border/50 rounded-2xl shadow-elevation-4 w-full ${sizes[size]} max-h-[95vh] sm:max-h-[90vh] my-auto overflow-hidden animate-scale-in relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        
        <div className="sticky top-0 bg-dark-card/95 backdrop-blur-xl border-b border-dark-border/50 px-5 sm:px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white truncate pr-2 glow-text">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-all duration-200 hover:bg-primary/20 rounded-xl p-2 flex-shrink-0 active:scale-95 hover:scale-105 group"
            aria-label="Close modal"
          >
            <X size={20} className="sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        <div className="p-5 sm:p-6 text-white relative z-10 overflow-y-auto max-h-[calc(95vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  )
}

