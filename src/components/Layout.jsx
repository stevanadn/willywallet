import { useState, useEffect } from 'react'
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gradient-dark relative">
      {/* Top Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-dark-card/95 backdrop-blur-xl border-b border-dark-border/50 shadow-elevation-3'
            : 'bg-dark-card/80 backdrop-blur-sm border-b border-dark-border/30'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-3 group animate-fade-in-down"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-xl blur-md group-hover:blur-lg transition-all duration-300" />
                <div className="relative bg-gradient-to-br from-primary to-primary-light p-2.5 rounded-xl shadow-glow-primary group-hover:scale-110 transition-transform duration-300">
                  <span className="text-xl sm:text-2xl"></span>
                </div>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white glow-text group-hover:scale-105 transition-transform duration-300">
                  Student Vault
                </h1>
                <p className="hidden sm:block text-xs text-white/60 -mt-0.5">
                  Financial Management App for Students
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navItems.map((item, index) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                      active
                        ? 'text-white bg-gradient-to-r from-primary/20 to-primary-light/20'
                        : 'text-white/70 hover:text-white hover:bg-primary/10'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary-light/30 rounded-xl blur-sm" />
                    )}
                    <Icon
                      className={`relative z-10 h-4 w-4 transition-transform duration-200 ${
                        active ? 'scale-110' : 'group-hover:scale-110'
                      }`}
                    />
                    <span className="relative z-10">{item.label}</span>
                    {active && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-primary to-primary-light rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Profile Menu & Mobile Menu Button */}
            <div className="flex items-center space-x-2">
              {/* Desktop Profile Link */}
              <Link
                to="/profile"
                className={`hidden md:flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive('/profile')
                    ? 'text-white bg-gradient-to-r from-primary/20 to-primary-light/20'
                    : 'text-white/70 hover:text-white hover:bg-primary/10'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>

              {/* Logout Button Desktop */}
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white/70 hover:text-white hover:bg-red-500/20 transition-all duration-200 active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden text-white/70 hover:text-white hover:bg-primary/20 rounded-xl p-2 transition-all duration-200 active:scale-95"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? (
                  <X size={24} className="animate-scale-in" />
                ) : (
                  <Menu size={24} className="animate-scale-in" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 w-72 bg-dark-card/98 backdrop-blur-xl border-l border-dark-border/50 shadow-elevation-4 z-50 animate-slide-in-left md:hidden overflow-y-auto">
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-5 border-b border-dark-border/50">
                <h2 className="text-xl font-bold text-white glow-text">Menu</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-400 hover:text-white transition-all duration-200 hover:bg-primary/20 rounded-xl p-2 active:scale-95"
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item, index) => {
                  const Icon = item.icon
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group ${
                        active
                          ? 'text-white bg-gradient-to-r from-primary/30 to-primary-light/30 shadow-glow-primary'
                          : 'text-white/70 hover:text-white hover:bg-primary/10'
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <Icon
                        className={`h-5 w-5 transition-transform duration-200 ${
                          active ? 'scale-110' : 'group-hover:scale-110'
                        }`}
                      />
                      <span>{item.label}</span>
                      {active && (
                        <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse" />
                      )}
                    </Link>
                  )
                })}
              </nav>

              {/* Mobile Footer Actions */}
              <div className="p-4 space-y-2 border-t border-dark-border/50">
                <Link
                  to="/profile"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 ${
                    isActive('/profile')
                      ? 'text-white bg-gradient-to-r from-primary/30 to-primary-light/30'
                      : 'text-white/70 hover:text-white hover:bg-primary/10'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-3.5 rounded-xl font-medium text-white/70 hover:text-white hover:bg-red-500/20 transition-all duration-200 active:scale-95"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="pt-16 sm:pt-20 pb-6 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="animate-fade-in">{children}</div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-card/95 backdrop-blur-xl border-t border-dark-border/50 shadow-elevation-3 z-40 safe-area-inset-bottom">
        <div className="flex justify-around px-2 py-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 min-w-0 flex-1 group ${
                  active
                    ? 'text-primary scale-110'
                    : 'text-white/60 hover:text-white/90'
                }`}
              >
                <div
                  className={`relative p-2 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-primary/20 shadow-glow-primary'
                      : 'group-hover:bg-primary/10'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform duration-200 ${
                      active ? 'scale-110' : 'group-hover:scale-110'
                    }`}
                  />
                  {active && (
                    <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium mt-1 transition-all duration-200 ${
                    active ? 'text-primary' : 'text-white/60'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
