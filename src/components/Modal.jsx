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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`bg-dark-card border border-dark-border rounded-xl shadow-glow-lg w-full ${sizes[size]} max-h-[95vh] sm:max-h-[90vh] my-auto overflow-y-auto animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-dark-card/95 backdrop-blur-sm border-b border-dark-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-white truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-all duration-200 hover:bg-primary/20 rounded-lg p-1 flex-shrink-0"
            aria-label="Close modal"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6 text-white">{children}</div>
      </div>
    </div>
  )
}

