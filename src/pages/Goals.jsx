import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks/useGoals'
import { useWallets } from '../hooks/useWallets'
import { useCategories } from '../hooks/useCategories'
import { useCreateTransaction } from '../hooks/useTransactions'
import { formatCurrency, calculatePercentage } from '../lib/utils'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Modal from '../components/Modal'
import { Plus, Edit, Trash2, Target, TrendingUp, Search, X } from 'lucide-react'

export default function Goals() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [editingGoal, setEditingGoal] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    deadline: '',
  })
  const [addMoneyData, setAddMoneyData] = useState({
    wallet_id: '',
    amount: '',
  })

  const { data: goals = [], isLoading } = useGoals(user?.id)
  const { data: wallets = [] } = useWallets(user?.id)
  const { data: categories = [] } = useCategories(user?.id)
  const createMutation = useCreateGoal()
  const updateMutation = useUpdateGoal()
  const deleteMutation = useDeleteGoal()
  const createTransactionMutation = useCreateTransaction()

  const savingsCategory = categories.find((c) => c.name === 'Savings' && c.type === 'expense')

  // Filter goals based on search query
  const filteredGoals = goals.filter((goal) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      goal.name?.toLowerCase().includes(query) ||
      formatCurrency(goal.target_amount).toLowerCase().includes(query) ||
      formatCurrency(goal.current_amount).toLowerCase().includes(query)
    )
  })

  const handleOpenModal = (goal = null) => {
    if (goal) {
      setEditingGoal(goal)
      setFormData({
        name: goal.name,
        target_amount: goal.target_amount,
        deadline: goal.deadline || '',
      })
    } else {
      setEditingGoal(null)
      setFormData({
        name: '',
        target_amount: '',
        deadline: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingGoal(null)
  }

  const handleOpenAddMoneyModal = (goal) => {
    setSelectedGoal(goal)
    setAddMoneyData({
      wallet_id: wallets[0]?.id || '',
      amount: '',
    })
    setIsAddMoneyModalOpen(true)
  }

  const handleCloseAddMoneyModal = () => {
    setIsAddMoneyModalOpen(false)
    setSelectedGoal(null)
    setAddMoneyData({
      wallet_id: '',
      amount: '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const targetAmount = parseFloat(formData.target_amount)
    if (!targetAmount || targetAmount <= 0) {
      alert('Target amount must be greater than 0')
      return
    }

    try {
      const goalData = {
        user_id: user.id,
        name: formData.name.trim(),
        target_amount: targetAmount,
        deadline: formData.deadline?.trim() || null,
      }

      if (editingGoal) {
        await updateMutation.mutateAsync({
          id: editingGoal.id,
          updates: goalData,
          user_id: user.id,
        })
      } else {
        await createMutation.mutateAsync(goalData)
      }

      handleCloseModal()
    } catch (error) {
      alert('Error saving goal: ' + error.message)
    }
  }

  const handleAddMoney = async (e) => {
    e.preventDefault()

    if (!selectedGoal) return

    const amount = parseFloat(addMoneyData.amount)
    if (!amount || amount <= 0) {
      alert('Amount must be greater than 0')
      return
    }

    if (!addMoneyData.wallet_id?.trim()) {
      alert('Please select a wallet')
      return
    }

    if (!savingsCategory) {
      alert('Savings category not found. Please create a "Savings" expense category first.')
      return
    }

    const wallet = wallets.find((w) => w.id === addMoneyData.wallet_id)
    if (wallet && parseFloat(wallet.balance || 0) < amount) {
      alert('Insufficient balance in selected wallet')
      return
    }

    try {
      // Create expense transaction
      await createTransactionMutation.mutateAsync({
        user_id: user.id,
        wallet_id: addMoneyData.wallet_id,
        category_id: savingsCategory.id,
        amount,
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        description: `Savings for: ${selectedGoal.name}`,
      })

      // Update goal current_amount
      await updateMutation.mutateAsync({
        id: selectedGoal.id,
        updates: {
          current_amount: parseFloat(selectedGoal.current_amount) + amount,
        },
        user_id: user.id,
      })

      handleCloseAddMoneyModal()
    } catch (error) {
      alert('Error adding money to goal: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      await deleteMutation.mutateAsync({ id, user_id: user.id })
    } catch (error) {
      alert('Error deleting goal: ' + error.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary shadow-glow-purple"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 animate-fade-in-down">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white glow-text">Goals & Savings</h1>
          <p className="text-white/70 mt-1 text-sm sm:text-base">Set and track your financial goals</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Search Bar */}
      {goals.length > 0 && (
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals..."
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
              Found {filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''}
            </p>
          )}
        </Card>
      )}

      {goals.length === 0 ? (
        <Card>
          <p className="text-center text-white/70 py-8">
            No goals set yet. Create your first savings goal!
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {filteredGoals.length === 0 && searchQuery ? (
            <Card className="col-span-2">
              <p className="text-center text-white/70 py-8">
                No goals found matching "{searchQuery}"
              </p>
            </Card>
          ) : (
            filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddMoney={() => handleOpenAddMoneyModal(goal)}
              onEdit={() => handleOpenModal(goal)}
              onDelete={() => handleDelete(goal.id)}
            />
            ))
          )}
        </div>
      )}

      {/* Add/Edit Goal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingGoal ? 'Edit Goal' : 'Add Goal'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            label="Goal Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Buy Laptop"
            required
          />

          <Input
            type="number"
            label="Target Amount"
            value={formData.target_amount}
            onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
            min="0.01"
            step="0.01"
            required
          />

          <Input
            type="date"
            label="Deadline (Optional)"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
          />

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <Button type="submit" className="flex-1 w-full sm:w-auto" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingGoal
                ? 'Update'
                : 'Add Goal'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Money to Goal Modal */}
      <Modal
        isOpen={isAddMoneyModalOpen}
        onClose={handleCloseAddMoneyModal}
        title={`Add Money to: ${selectedGoal?.name}`}
      >
        <form onSubmit={handleAddMoney} className="space-y-4">
          <Select
            label="From Wallet"
            value={addMoneyData.wallet_id}
            onChange={(e) => setAddMoneyData({ ...addMoneyData, wallet_id: e.target.value })}
            options={wallets.map((w) => ({
              value: w.id,
              label: `${w.name} (${formatCurrency(w.balance)})`,
            }))}
            required
          />

          <Input
            type="number"
            label="Amount"
            value={addMoneyData.amount}
            onChange={(e) => setAddMoneyData({ ...addMoneyData, amount: e.target.value })}
            min="0.01"
            step="0.01"
            required
          />

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <Button type="submit" className="flex-1 w-full sm:w-auto" disabled={createTransactionMutation.isPending}>
              {createTransactionMutation.isPending ? 'Processing...' : 'Add Money'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseAddMoneyModal} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function GoalCard({ goal, onAddMoney, onEdit, onDelete }) {
  const percentage = calculatePercentage(goal.current_amount, goal.target_amount)
  const remaining = goal.target_amount - goal.current_amount
  const isComplete = percentage >= 100

  return (
    <Card>
      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-full flex-shrink-0">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-white truncate">{goal.name}</h3>
            {goal.deadline && (
              <p className="text-xs sm:text-sm text-white/70 mt-1">
                Deadline: {new Date(goal.deadline).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 sm:p-2 text-white/70 hover:text-primary transition-colors"
            aria-label="Edit goal"
          >
            <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
            aria-label="Delete goal"
          >
            <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-white/70">Progress</span>
          <span className="text-sm font-medium text-primary">
            {percentage.toFixed(1)}%
          </span>
        </div>

        <div className="relative">
          <div className="w-full bg-dark-border rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                isComplete ? 'bg-primary-light' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
          <div>
            <p className="text-xs text-white/70">Current</p>
            <p className="text-base sm:text-lg font-semibold text-white truncate">
              {formatCurrency(goal.current_amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/70">Target</p>
            <p className="text-base sm:text-lg font-semibold text-white truncate">
              {formatCurrency(goal.target_amount)}
            </p>
          </div>
        </div>

        {!isComplete && (
          <div className="pt-2">
            <p className="text-sm text-white/70 mb-2">
              Remaining: <span className="font-semibold text-white">{formatCurrency(remaining)}</span>
            </p>
            <Button
              onClick={onAddMoney}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Add Money
            </Button>
          </div>
        )}

        {isComplete && (
          <div className="pt-2">
            <div className="bg-primary/20 text-primary-light px-4 py-2 rounded-lg text-center">
              <p className="font-semibold">🎉 Goal Achieved!</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

