import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import { useWallets } from '../hooks/useWallets'
import { useTransactions } from '../hooks/useTransactions'
import { useBudgets } from '../hooks/useBudgets'
import { useGoals } from '../hooks/useGoals'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { User, Mail, Calendar, Wallet, TrendingUp, Target, PiggyBank, Edit2, Save, X } from 'lucide-react'
import { formatCurrency } from '../lib/utils'

export default function Profile() {
  const { user } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id)
  const updateProfileMutation = useUpdateProfile()
  const { data: wallets = [] } = useWallets(user?.id)
  const { data: transactions = [] } = useTransactions(user?.id)
  const { data: budgets = [] } = useBudgets(user?.id, new Date().getMonth() + 1, new Date().getFullYear())
  const { data: goals = [] } = useGoals(user?.id)

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  })

  const handleEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || user?.email || '',
      })
      setIsEditing(true)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      full_name: '',
      email: '',
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await updateProfileMutation.mutateAsync({
        id: user.id,
        updates: {
          full_name: formData.full_name,
          email: formData.email,
        },
      })
      setIsEditing(false)
    } catch (error) {
      alert('Error updating profile: ' + error.message)
    }
  }

  // Calculate statistics
  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0)
  const totalTransactions = transactions.length
  const totalBudgets = budgets.length
  const totalGoals = goals.length
  const activeGoals = goals.filter((g) => {
    if (!g.deadline) return parseFloat(g.current_amount || 0) < parseFloat(g.target_amount || 0)
    return new Date(g.deadline) >= new Date() && parseFloat(g.current_amount || 0) < parseFloat(g.target_amount || 0)
  }).length

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary shadow-glow-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl font-bold text-white glow-text">Profile</h1>
        <p className="text-white/70 mt-1 text-sm sm:text-base">Manage your account information</p>
      </div>

      {/* Profile Information Card */}
      <Card glow className="animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Personal Information</h2>
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={handleEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              type="text"
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter your full name"
              required
            />

            <Input
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email"
              required
            />

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
              <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-white/70">Full Name</p>
                <p className="text-lg font-semibold text-white">
                  {profile?.full_name || user?.email?.split('@')[0] || 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-white/70">Email</p>
                <p className="text-lg font-semibold text-white">
                  {profile?.email || user?.email || 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-white/70">Member Since</p>
                <p className="text-lg font-semibold text-white">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card hover glow className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-white/70">Total Balance</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1 truncate">
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex-shrink-0 ml-2">
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card hover glow className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-white/70">Total Transactions</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1">{totalTransactions}</p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex-shrink-0 ml-2">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card hover glow className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-white/70">Active Budgets</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1">{totalBudgets}</p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex-shrink-0 ml-2">
              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card hover glow className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-white/70">Active Goals</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1">{activeGoals}</p>
            </div>
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex-shrink-0 ml-2">
              <PiggyBank className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Account Summary */}
      <Card glow className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Account Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
            <p className="text-sm text-white/70 mb-2">Total Wallets</p>
            <p className="text-2xl font-bold text-white">{wallets.length}</p>
          </div>
          <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
            <p className="text-sm text-white/70 mb-2">Total Goals</p>
            <p className="text-2xl font-bold text-white">{totalGoals}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

