import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  Target,
  PiggyBank,
  MessageSquare,
  User,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Wallet, label: 'Transactions' },
    { path: '/budgets', icon: Target, label: 'Budgets' },
    { path: '/goals', icon: PiggyBank, label: 'Goals' },
    { path: '/advisor', icon: MessageSquare, label: 'Advisor' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gradient-dark relative">
      {/* Desktop Sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col z-20">
        <div className="flex flex-col flex-grow bg-dark-card/80 backdrop-blur-sm border-r border-dark-border pt-5 pb-4 overflow-y-auto shadow-glow-purple">
          <div className="flex items-center flex-shrink-0 px-4 mb-8 animate-fade-in-down">
            <h1 className="text-2xl font-bold text-white glow-text">
              💰 Willy Wallet
            </h1>
          </div>
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 animate-fade-in-up ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-glow-purple transform scale-105'
                      : 'text-white hover:bg-primary/20 hover:text-white hover:translate-x-1 border border-transparent hover:border-primary/30'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex-shrink-0 px-4">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-white rounded-lg hover:bg-primary/20 hover:text-white transition-all duration-300 hover:translate-x-1 border border-transparent hover:border-primary/30"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-dark-card/95 backdrop-blur-sm border-b border-dark-border px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-glow-purple z-20 sticky top-0 safe-area-inset-top">
        <h1 className="text-lg sm:text-xl font-bold text-white glow-text truncate">
          💰 Willy Wallet
        </h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-300 hover:bg-primary/20 rounded-lg p-1.5 sm:p-2 transition-all duration-200 flex-shrink-0"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} className="sm:w-6 sm:h-6" /> : <Menu size={20} className="sm:w-6 sm:h-6" />}
        </button>
      </header>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 sm:w-72 bg-dark-card/98 backdrop-blur-sm shadow-glow-lg animate-slide-in-left border-r border-dark-border">
            <div className="flex flex-col h-full pt-4 sm:pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between px-3 sm:px-4 mb-6 sm:mb-8 flex-shrink-0">
                <h1 className="text-lg sm:text-xl font-bold text-white glow-text">
                  💰 Willy Wallet
                </h1>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-400 hover:text-gray-200 transition-all duration-200 hover:bg-primary/20 rounded-lg p-1.5 flex-shrink-0"
                  aria-label="Close menu"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>
              <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
                {navItems.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                        isActive(item.path)
                          ? 'bg-gradient-to-r from-primary to-primary-light text-white shadow-glow-purple'
                          : 'text-white hover:bg-primary/20 hover:text-white'
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <Icon className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
              <div className="px-3 sm:px-4 flex-shrink-0 pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-white rounded-lg hover:bg-primary/20 hover:text-white transition-all duration-300"
                >
                  <LogOut className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="md:ml-64 pb-20 md:pb-0 relative z-10">
        <div className="py-4 md:py-6 px-3 sm:px-4 md:px-8 animate-fade-in">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-card/95 backdrop-blur-sm border-t border-dark-border px-1 py-1.5 shadow-glow-purple z-20 safe-area-inset-bottom">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-lg transition-all duration-300 min-w-0 flex-1 ${
                  isActive(item.path)
                    ? 'text-primary transform scale-105 glow-text'
                    : 'text-white/80 hover:text-primary'
                }`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5" />
                <span className="text-[10px] sm:text-xs font-medium truncate w-full text-center">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

