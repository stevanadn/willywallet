import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWallets, useCreateWallet, useDeleteWallet } from '../hooks/useWallets'
import { useMonthlyTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency } from '../lib/utils'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Line } from 'recharts'
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [walletName, setWalletName] = useState('')
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const { data: wallets = [], isLoading: walletsLoading } = useWallets(user?.id)
  const { data: transactions = [], isLoading: transactionsLoading, error: transactionsError } = useMonthlyTransactions(
    user?.id,
    currentMonth,
    currentYear
  )
  const { data: categories = [] } = useCategories(user?.id, 'expense')
  const createWalletMutation = useCreateWallet()
  const deleteWalletMutation = useDeleteWallet()

  // Calculate totals
  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0)
  const monthlyIncome = transactions
    .filter((t) => t && t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
  const monthlyExpense = transactions
    .filter((t) => t && t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

  // Calculate expense breakdown by category
  const expenseBreakdown = categories.map((category) => {
    const categoryExpenses = transactions.filter(
      (t) => t.category_id === category.id && t.type === 'expense'
    )
    const total = categoryExpenses.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0
    )
    return {
      name: category.name,
      value: total,
      icon: category.icon,
    }
  }).filter((item) => item.value > 0)

  // Helper function to normalize date strings (handles both YYYY-MM-DD and YYYY-MM-DDTHH:mm:ss formats)
  const normalizeDate = (dateStr) => {
    if (!dateStr) return ''
    // If it's already in YYYY-MM-DD format, return as is
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr
    }
    // If it includes time, extract just the date part
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      return dateStr.split('T')[0]
    }
    // If it's a Date object, convert to YYYY-MM-DD
    if (dateStr instanceof Date) {
      return dateStr.toISOString().split('T')[0]
    }
    return String(dateStr).substring(0, 10)
  }

  // Calculate daily expenses for the month
  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate()
  }

  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const dailyExpenses = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const dayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayTransactions = transactions.filter(
      (t) => t.type === 'expense' && normalizeDate(t.date) === dayStr
    )
    const total = dayTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
    return {
      day: day,
      date: dayStr,
      expense: total,
      income: transactions
        .filter((t) => t.type === 'income' && normalizeDate(t.date) === dayStr)
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
    }
  })

  // Calculate net savings
  const netSavings = monthlyIncome - monthlyExpense

  const COLORS = ['#ffffff', '#cbd5e1', '#94a3b8', '#64748b', '#1e3a5f', '#2d4a6f', '#3d5a7f']

  const handleCreateWallet = async (e) => {
    e.preventDefault()
    if (!walletName.trim()) {
      alert('Please enter a wallet name')
      return
    }

    try {
      await createWalletMutation.mutateAsync({
        user_id: user.id,
        name: walletName.trim(),
        balance: 0,
      })
      setWalletName('')
      setIsWalletModalOpen(false)
    } catch (error) {
      alert('Error creating wallet: ' + error.message)
    }
  }

  const handleDeleteWallet = async (walletId, walletName) => {
    if (!confirm(`Are you sure you want to delete "${walletName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteWalletMutation.mutateAsync({
        id: walletId,
        user_id: user.id,
      })
    } catch (error) {
      alert('Error deleting wallet: ' + error.message)
    }
  }

  if (walletsLoading || transactionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Debug: Log transactions to help diagnose issues
  if (transactionsError) {
    console.error('Error loading transactions:', transactionsError)
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl font-bold text-white glow-text">Dashboard</h1>
        <p className="text-white/70 mt-1 text-sm sm:text-base">Overview of your finances</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card hover glow className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-white/70">Total Balance</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1 truncate">
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full transform transition-transform duration-300 hover:scale-110 shadow-glow-purple flex-shrink-0 ml-2">
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card hover glow className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-white/70">Monthly Income</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1 truncate">
                {formatCurrency(monthlyIncome)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full transform transition-transform duration-300 hover:scale-110 shadow-glow-purple flex-shrink-0 ml-2">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary-light" />
            </div>
          </div>
        </Card>

        <Card hover glow className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-white/70">Monthly Expense</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1 truncate">
                {formatCurrency(monthlyExpense)}
              </p>
              {monthlyIncome > 0 && (
                <p className="text-xs text-white/50 mt-1">
                  {((monthlyExpense / monthlyIncome) * 100).toFixed(1)}% of income
                </p>
              )}
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full transform transition-transform duration-300 hover:scale-110 flex-shrink-0 ml-2">
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-primary-light" />
            </div>
          </div>
        </Card>
      </div>

      {/* Income vs Expense Comparison Chart */}
      {(monthlyIncome > 0 || monthlyExpense > 0) && (
        <Card glow className="animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
            Income vs Expenses
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={[{ name: 'Income', income: monthlyIncome, expense: monthlyExpense, net: netSavings }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  backgroundColor: '#1a1625',
                  color: '#ffffff'
                }}
                itemStyle={{ color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Legend 
                wrapperStyle={{ color: '#ffffff' }}
                formatter={(value) => <span style={{ color: '#ffffff' }}>{value}</span>}
              />
              <Bar dataKey="income" fill="#10b981" name="Income" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[8, 8, 0, 0]} />
              <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={2} name="Net Savings" dot={{ fill: '#8b5cf6', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-dark-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Net Savings:</span>
              <span className={`font-semibold ${netSavings >= 0 ? 'text-primary-light' : 'text-red-400'}`}>
                {formatCurrency(netSavings)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Daily Expense Chart */}
      {dailyExpenses.some((d) => d.expense > 0) && (
        <Card glow className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
            Daily Expenses - {new Date(currentYear, currentMonth - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyExpenses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="day" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                interval={Math.floor(daysInMonth / 10)}
              />
              <YAxis 
                stroke="#9ca3af" 
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `Day ${label}`}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  backgroundColor: '#1a1625',
                  color: '#ffffff'
                }}
                itemStyle={{ color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Bar 
                dataKey="expense" 
                fill="#ef4444" 
                name="Expense"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Expense Breakdown Chart */}
      {expenseBreakdown.length > 0 && (
        <Card glow className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
            Expense Breakdown by Category
          </h2>
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
            <PieChart>
              <Pie
                data={expenseBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#1e3a5f"
                dataKey="value"
                animationDuration={800}
              >
                {expenseBreakdown.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  backgroundColor: '#1a1625',
                  color: '#ffffff'
                }}
                itemStyle={{ color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Legend 
                wrapperStyle={{ color: '#ffffff' }}
                formatter={(value) => <span style={{ color: '#ffffff' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {expenseBreakdown.length === 0 && (
        <Card glow className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-center text-white/70 py-8">
            No expenses recorded this month. Start tracking your expenses!
          </p>
        </Card>
      )}

      {/* Wallets Section */}
      <Card glow className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-white">Your Wallets</h2>
          <Button size="sm" onClick={() => setIsWalletModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
        </div>
        {wallets.length === 0 ? (
          <p className="text-center text-white/70 py-4 text-sm sm:text-base">
            No wallets yet. Create your first wallet to start tracking transactions!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {wallets.map((wallet, index) => (
              <div
                key={wallet.id}
                className="p-3 sm:p-4 bg-gradient-to-br from-dark-card to-dark-bg rounded-lg border border-dark-border hover:border-primary/50 transition-all duration-300 hover:shadow-glow-purple hover:-translate-y-1 animate-fade-in-up relative group"
                style={{ animationDelay: `${0.6 + index * 0.1}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-white/70 truncate">{wallet.name}</p>
                    <p className="text-lg sm:text-xl font-bold text-white mt-1 truncate">
                      {formatCurrency(wallet.balance)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteWallet(wallet.id, wallet.name)}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0 ml-2"
                    title="Delete wallet"
                    disabled={deleteWalletMutation.isPending}
                    aria-label="Delete wallet"
                  >
                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Wallet Modal */}
      <Modal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false)
          setWalletName('')
        }}
        title="Create New Wallet"
      >
        <form onSubmit={handleCreateWallet} className="space-y-4">
          <Input
            type="text"
            label="Wallet Name"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            placeholder="e.g., Cash, Bank BCA, OVO"
            required
          />
          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1" disabled={createWalletMutation.isPending}>
              {createWalletMutation.isPending ? 'Creating...' : 'Create Wallet'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsWalletModalOpen(false)
                setWalletName('')
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

