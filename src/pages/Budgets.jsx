import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useBudgets, useBudgetSpending, useCreateBudget, useUpdateBudget, useDeleteBudget } from '../hooks/useBudgets'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency, calculatePercentage } from '../lib/utils'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Modal from '../components/Modal'
import { Plus, Edit, Trash2, AlertTriangle, Search, X } from 'lucide-react'

export default function Budgets() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    category_id: '',
    amount_limit: '',
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    description: '',
  })

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const { data: budgets = [], isLoading } = useBudgets(user?.id, currentMonth, currentYear)
  const { data: expenseCategories = [] } = useCategories(user?.id, 'expense')
  const createMutation = useCreateBudget()
  const updateMutation = useUpdateBudget()
  const deleteMutation = useDeleteBudget()

  // Filter budgets based on search query
  const filteredBudgets = budgets.filter((budget) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const categoryName = budget.category?.name?.toLowerCase() || ''
    const description = budget.description?.toLowerCase() || ''
    
    return (
      categoryName.includes(query) ||
      description.includes(query) ||
      formatCurrency(budget.amount_limit).toLowerCase().includes(query)
    )
  })

  const handleOpenModal = (budget = null) => {
    if (budget) {
      setEditingBudget(budget)
      setFormData({
        category_id: budget.category_id,
        amount_limit: budget.amount_limit,
        period_month: budget.period_month,
        period_year: budget.period_year,
        description: budget.description || '',
      })
    } else {
      setEditingBudget(null)
      setFormData({
        category_id: '',
        amount_limit: '',
        period_month: currentMonth,
        period_year: currentYear,
        description: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingBudget(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.category_id?.trim()) {
      alert('Please select a category')
      return
    }

    const amountLimit = parseFloat(formData.amount_limit)
    if (!amountLimit || amountLimit <= 0) {
      alert('Budget limit must be greater than 0')
      return
    }

    try {

      const budgetData = {
        user_id: user.id,
        category_id: formData.category_id.trim(),
        amount_limit: amountLimit,
        period_month: parseInt(formData.period_month),
        period_year: parseInt(formData.period_year),
      }
      
      // Only include description if it has a value (to avoid errors if column doesn't exist)
      if (formData.description?.trim()) {
        budgetData.description = formData.description.trim()
      }

      if (editingBudget) {
        await updateMutation.mutateAsync({
          id: editingBudget.id,
          updates: budgetData,
          user_id: user.id,
        })
      } else {
        await createMutation.mutateAsync(budgetData)
      }

      handleCloseModal()
    } catch (error) {
      alert('Error saving budget: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this budget?')) return

    try {
      await deleteMutation.mutateAsync({ id, user_id: user.id })
    } catch (error) {
      alert('Error deleting budget: ' + error.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 animate-fade-in-down">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white glow-text">Budgets</h1>
          <p className="text-white/70 mt-1 text-sm sm:text-base">Track your monthly spending limits</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Search Bar */}
      {budgets.length > 0 && (
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search budgets..."
              className="pl-9 sm:pl-10 pr-9 sm:pr-10 text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs sm:text-sm text-white/70 mt-2">
              Found {filteredBudgets.length} budget{filteredBudgets.length !== 1 ? 's' : ''}
            </p>
          )}
        </Card>
      )}

      {budgets.length === 0 ? (
        <Card>
          <p className="text-center text-white/70 py-8">
            No budgets set for this month. Create your first budget!
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {filteredBudgets.length === 0 && searchQuery ? (
            <Card className="col-span-2">
              <p className="text-center text-white/70 py-8">
                No budgets found matching "{searchQuery}"
              </p>
            </Card>
          ) : (
            filteredBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              user={user}
              onEdit={() => handleOpenModal(budget)}
              onDelete={() => handleDelete(budget.id)}
            />
            ))
          )}
        </div>
      )}

      {/* Add/Edit Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingBudget ? 'Edit Budget' : 'Add Budget'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Category"
            value={formData.category_id || ''}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            options={[
              { value: '', label: 'Select a category...' },
              ...expenseCategories.map((c) => ({
                value: c.id,
                label: `${c.icon} ${c.name}`,
              })),
            ]}
            required
          />

          <Input
            type="number"
            label="Budget Limit"
            value={formData.amount_limit}
            onChange={(e) => setFormData({ ...formData, amount_limit: e.target.value })}
            min="0.01"
            step="0.01"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Month"
              value={formData.period_month}
              onChange={(e) => setFormData({ ...formData, period_month: e.target.value })}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
              }))}
              required
            />

            <Input
              type="number"
              label="Year"
              value={formData.period_year}
              onChange={(e) => setFormData({ ...formData, period_year: e.target.value })}
              min="2020"
              required
            />
          </div>

          <Input
            type="text"
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add notes about this budget..."
          />

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <Button type="submit" className="flex-1 w-full sm:w-auto" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingBudget
                ? 'Update'
                : 'Add Budget'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function BudgetCard({ budget, user, onEdit, onDelete }) {
  const { data: spent = 0, isLoading: spendingLoading } = useBudgetSpending(
    user?.id,
    budget.category_id,
    budget.period_month,
    budget.period_year
  )

  const percentage = calculatePercentage(spent, budget.amount_limit)
  const remaining = budget.amount_limit - spent
  const isOverBudget = percentage >= 100
  const isWarning = percentage >= 80 && percentage < 100

  const progressColor = isOverBudget
    ? 'bg-red-600'
    : isWarning
    ? 'bg-yellow-500'
    : 'bg-primary'

  if (spendingLoading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-4 bg-dark-border rounded w-3/4 mb-4"></div>
          <div className="h-2 bg-dark-border rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card hover className="animate-fade-in-up">
      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <span className="text-xl sm:text-2xl flex-shrink-0">{budget.category?.icon}</span>
            <h3 className="text-base sm:text-lg font-semibold text-white truncate">
              {budget.category?.name || 'Unknown'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-white/70 mt-1">
            {new Date(budget.period_year, budget.period_month - 1, 1).toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
          {budget.description && (
            <p className="text-xs sm:text-sm text-white/60 mt-2 italic break-words">
              {budget.description}
            </p>
          )}
        </div>
        <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-primary transition-colors"
            aria-label="Edit budget"
          >
            <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
            aria-label="Delete budget"
          >
            <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Spent</span>
          <span className="font-medium">{formatCurrency(spent)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Limit</span>
          <span className="font-medium">{formatCurrency(budget.amount_limit)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Remaining</span>
          <span
            className={`font-medium ${
              remaining < 0 ? 'text-red-400' : 'text-primary-light'
            }`}
          >
            {formatCurrency(remaining)}
          </span>
        </div>

        <div className="relative pt-2">
          <div className="w-full bg-dark-border rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${progressColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-white/70">
              {percentage.toFixed(1)}% used
            </span>
            {isOverBudget && (
              <div className="flex items-center space-x-1 text-red-600 text-xs">
                <AlertTriangle size={14} />
                <span>Over Budget!</span>
              </div>
            )}
            {isWarning && !isOverBudget && (
              <div className="flex items-center space-x-1 text-yellow-600 text-xs">
                <AlertTriangle size={14} />
                <span>Warning</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

