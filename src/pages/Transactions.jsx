import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '../hooks/useTransactions'
import { useWallets } from '../hooks/useWallets'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency, formatDate, groupTransactionsByDate } from '../lib/utils'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import Modal from '../components/Modal'
import { Plus, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, Search, X } from 'lucide-react'

export default function Transactions() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    wallet_id: '',
    category_id: '',
    amount: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    description: '',
  })

  const { data: transactions = [], isLoading } = useTransactions(user?.id)
  const { data: wallets = [] } = useWallets(user?.id)
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(user?.id)
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()

  // Helper functions to find related data
  const getCategory = (id) => categories.find((c) => c.id === id)
  const getWallet = (id) => wallets.find((w) => w.id === id)

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const category = getCategory(transaction.category_id)
    const wallet = getWallet(transaction.wallet_id)
    
    return (
      category?.name?.toLowerCase().includes(query) ||
      wallet?.name?.toLowerCase().includes(query) ||
      transaction.description?.toLowerCase().includes(query) ||
      formatCurrency(transaction.amount).toLowerCase().includes(query) ||
      transaction.type?.toLowerCase().includes(query)
    )
  })

  const groupedTransactions = groupTransactionsByDate(filteredTransactions)
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a))

  const filteredCategories = categories.filter((c) => c.type === formData.type)

  const handleOpenModal = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction)
      setFormData({
        wallet_id: transaction.wallet_id,
        category_id: transaction.category_id,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description || '',
      })
    } else {
      setEditingTransaction(null)
      setFormData({
        wallet_id: wallets[0]?.id || '',
        category_id: '',
        amount: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        description: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTransaction(null)
    setFormData({
      wallet_id: wallets[0]?.id || '',
      category_id: '',
      amount: '',
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      description: '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      alert('Amount must be greater than 0')
      return
    }

    if (!formData.wallet_id?.trim()) {
      alert('Please select a wallet')
      return
    }

    if (!formData.category_id || !formData.category_id.trim()) {
      alert('Please select a category')
      return
    }

    // Check wallet balance for expense transactions
    if (formData.type === 'expense') {
      const wallet = wallets.find((w) => w.id === formData.wallet_id.trim())
      if (!wallet) {
        alert('Wallet not found')
        return
      }

      const currentBalance = parseFloat(wallet.balance || 0)
      
      if (editingTransaction) {
        // For updates, calculate what the balance will be after the update
        const oldAmount = parseFloat(editingTransaction.amount || 0)
        const oldType = editingTransaction.type
        const oldWalletId = editingTransaction.wallet_id
        const isWalletChanged = formData.wallet_id.trim() !== oldWalletId
        
        if (isWalletChanged) {
          // Wallet changed - check if new wallet has enough balance
          if (currentBalance < amount) {
            alert(`Insufficient balance in selected wallet. Available: ${formatCurrency(currentBalance)}`)
            return
          }
        } else {
          // Same wallet - calculate net effect
          // The database trigger will: reverse old transaction, then apply new transaction
          // For expense: reverse means adding back, new means subtracting
          let newBalance = currentBalance
          
          if (oldType === 'expense') {
            // Reverse old expense (add back), then apply new expense (subtract)
            newBalance = currentBalance + oldAmount - amount
          } else {
            // Reverse old income (subtract), then apply new expense (subtract)
            newBalance = currentBalance - oldAmount - amount
          }
          
          if (newBalance < 0) {
            alert(`Insufficient balance. This would result in a balance of ${formatCurrency(newBalance)}`)
            return
          }
        }
      } else {
        // For new transactions, check if balance is sufficient
        if (currentBalance < amount) {
          alert(`Insufficient balance in selected wallet. Available: ${formatCurrency(currentBalance)}`)
          return
        }
      }
    }

    try {
      const transactionData = {
        user_id: user.id,
        wallet_id: formData.wallet_id.trim(),
        category_id: formData.category_id.trim(),
        amount,
        type: formData.type,
        date: formData.date,
        description: formData.description,
      }

      if (editingTransaction) {
        await updateMutation.mutateAsync({
          id: editingTransaction.id,
          updates: transactionData,
          user_id: user.id,
          oldTransaction: editingTransaction,
        })
      } else {
        await createMutation.mutateAsync(transactionData)
      }

      handleCloseModal()
    } catch (error) {
      alert('Error saving transaction: ' + error.message)
    }
  }

  const handleDelete = async (transaction) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      await deleteMutation.mutateAsync({ id: transaction.id, user_id: user.id, transaction })
    } catch (error) {
      alert('Error deleting transaction: ' + error.message)
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white glow-text">Transactions</h1>
          <p className="text-white/70 mt-1 text-sm sm:text-base">Manage your income and expenses</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Search Bar */}
      {transactions.length > 0 && (
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
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
              Found {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </p>
          )}
        </Card>
      )}

      {sortedDates.length === 0 ? (
        <Card>
          <p className="text-center text-white/70 py-8">
            {searchQuery 
              ? `No transactions found matching "${searchQuery}"`
              : 'No transactions yet. Add your first transaction!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">
                {formatDate(date)}
              </h2>
              <div className="space-y-2">
                {groupedTransactions[date].map((transaction) => {
                  const category = getCategory(transaction.category_id)
                  const wallet = getWallet(transaction.wallet_id)
                  const isIncome = transaction.type === 'income'

                  return (
                    <Card key={transaction.id} className="p-3 sm:p-4 hover" style={{ animationDelay: '0.1s' }}>
                      <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-start sm:items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                          <div
                            className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                              isIncome ? 'bg-primary/20' : 'bg-red-500/20'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpCircle
                                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                                  isIncome ? 'text-primary-light' : 'text-red-400'
                                }`}
                              />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 sm:space-x-2">
                              <span className="text-base sm:text-lg flex-shrink-0">{category?.icon}</span>
                              <p className="font-medium text-white text-sm sm:text-base truncate">
                                {category?.name || 'Unknown'}
                              </p>
                            </div>
                            <p className="text-xs sm:text-sm text-white/70 truncate">
                              {wallet?.name || 'Unknown Wallet'}
                              {transaction.description && ` • ${transaction.description}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p
                              className={`font-semibold text-sm sm:text-base ${
                                isIncome ? 'text-primary-light' : 'text-red-400'
                              }`}
                            >
                              {isIncome ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                          <button
                            onClick={() => handleOpenModal(transaction)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-primary transition-colors"
                            aria-label="Edit transaction"
                          >
                            <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction)}
                            className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="Delete transaction"
                          >
                            <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Type
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, type: 'income', category_id: '' })
                }}
                className={`flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg border-2 transition-colors ${
                  formData.type === 'income'
                    ? 'border-primary bg-primary/20 text-primary-light'
                    : 'border-dark-border text-white bg-dark-card'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, type: 'expense', category_id: '' })
                }}
                className={`flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg border-2 transition-colors ${
                  formData.type === 'expense'
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-dark-border text-white bg-dark-card'
                }`}
              >
                Expense
              </button>
            </div>
          </div>

          <Select
            label="Wallet"
            value={formData.wallet_id}
            onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}
            options={wallets.map((w) => ({
              value: w.id,
              label: `${w.name} (${formatCurrency(w.balance)})`,
            }))}
            required
          />

          {categoriesLoading ? (
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">
                Category
              </label>
              <div className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white/70">
                Loading categories...
              </div>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">
                Category
              </label>
              <div className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-white/70">
                No {formData.type} categories available. Please create one first.
              </div>
            </div>
          ) : (
            <Select
              label="Category"
              value={formData.category_id || ''}
              onChange={(e) => {
                const value = e.target.value
                setFormData({ ...formData, category_id: value })
              }}
              options={[
                { value: '', label: 'Select a category...' },
                ...filteredCategories.map((c) => ({
                  value: c.id,
                  label: `${c.icon} ${c.name}`,
                })),
              ]}
              required
            />
          )}

          <Input
            type="number"
            label="Amount"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            min="0.01"
            step="0.01"
            required
          />

          <Input
            type="date"
            label="Date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />

          <Input
            type="text"
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add a note..."
          />

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
            <Button type="submit" className="flex-1 w-full sm:w-auto" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingTransaction
                ? 'Update'
                : 'Add Transaction'}
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

