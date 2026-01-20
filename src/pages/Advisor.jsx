import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWallets } from '../hooks/useWallets'
import { useMonthlyTransactions } from '../hooks/useTransactions'
import { useBudgets } from '../hooks/useBudgets'
import { useCategories } from '../hooks/useCategories'
import { useGoals } from '../hooks/useGoals'
import { useProfile } from '../hooks/useProfile'
import { useChatHistory, useSaveChatMessage, useClearChatHistory } from '../hooks/useChatHistory'
import { formatCurrency } from '../lib/utils'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { Send, Bot, User, Trash2 } from 'lucide-react'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export default function Advisor() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const { data: wallets = [] } = useWallets(user?.id)
  const { data: transactions = [] } = useMonthlyTransactions(user?.id, currentMonth, currentYear)
  const { data: budgets = [] } = useBudgets(user?.id, currentMonth, currentYear)
  const { data: categories = [] } = useCategories(user?.id)
  const { data: goals = [] } = useGoals(user?.id)
  const { data: profile } = useProfile(user?.id)
  
  // Chat history hooks
  const { data: chatHistory = [], isLoading: chatHistoryLoading } = useChatHistory(user?.id)
  const saveMessageMutation = useSaveChatMessage()
  const clearChatMutation = useClearChatHistory()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load chat history on mount
  useEffect(() => {
    if (!user?.id || isInitialized) return

    if (chatHistoryLoading) return

    if (chatHistory.length > 0) {
      // Convert chat history to messages format
      const historyMessages = chatHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
      setMessages(historyMessages)
      setIsInitialized(true)
    } else {
      // No chat history, show welcome message
      const welcomeMessage = {
        role: 'assistant',
        content: "Hi! I'm Willy, your financial mentor. I'm here to help you manage your money better. Ask me anything about your finances! 💰",
      }
      setMessages([welcomeMessage])
      setIsInitialized(true)
      
      // Save welcome message to database
      saveMessageMutation.mutate({
        user_id: user.id,
        role: 'assistant',
        content: welcomeMessage.content,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory, isInitialized, chatHistoryLoading, user?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Calculate financial summary for AI context
  const getFinancialContext = () => {
    const parseAmount = (val) => parseFloat(val || 0)
    
    const totalBalance = wallets.reduce((sum, w) => sum + parseAmount(w.balance), 0)
    const monthlyIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + parseAmount(t.amount), 0)
    const monthlyExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + parseAmount(t.amount), 0)

    // Top expense categories
    const expenseByCategory = {}
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const category = categories.find((c) => c.id === t.category_id)
        if (category) {
          expenseByCategory[category.name] = (expenseByCategory[category.name] || 0) + parseAmount(t.amount)
        }
      })

    const topExpenseCategories = Object.entries(expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, amount]) => `${name}: ${formatCurrency(amount)}`)
      .join(', ') || 'No expenses yet'

    // Budget analysis
    const totalBudgetLimit = budgets.reduce((sum, b) => sum + parseAmount(b.amount_limit), 0)
    
    const overBudgetCategories = budgets
      .map((budget) => {
        const category = categories.find((c) => c.id === budget.category_id)
        if (!category) return null
        
        const limit = parseAmount(budget.amount_limit)
        if (limit === 0) return null
        
        const spent = transactions
          .filter((t) => t.category_id === budget.category_id && t.type === 'expense')
          .reduce((sum, t) => sum + parseAmount(t.amount), 0)
        
        if (spent > limit) {
          const percentage = ((spent / limit) * 100).toFixed(0)
          return `${category.name} (${percentage}% over)`
        }
        return null
      })
      .filter(Boolean)
      .join(', ') || 'All budgets are within limit'

    // Goals analysis
    const today = new Date()
    const activeGoals = goals.filter((g) => {
      const current = parseAmount(g.current_amount)
      const target = parseAmount(g.target_amount)
      if (!g.deadline) return current < target
      return new Date(g.deadline) >= today && current < target
    })

    const goalsProgress = activeGoals
      .filter((g) => parseAmount(g.target_amount) > 0)
      .map((g) => {
        const target = parseAmount(g.target_amount)
        const current = parseAmount(g.current_amount)
        const percentage = ((current / target) * 100).toFixed(0)
        const remaining = Math.max(0, target - current)
        return `${g.name || 'Unnamed Goal'}: ${percentage}% complete, ${formatCurrency(remaining)} remaining`
      })
      .join('; ') || 'No active goals'

    return {
      userName: profile?.full_name || user?.email?.split('@')[0] || 'User',
      currentBalance: formatCurrency(totalBalance),
      monthlyIncome: formatCurrency(monthlyIncome),
      monthlyExpense: formatCurrency(monthlyExpense),
      netFlow: formatCurrency(monthlyIncome - monthlyExpense),
      topExpenseCategories,
      totalBudgetLimit: formatCurrency(totalBudgetLimit),
      totalBudgets: budgets.length,
      overBudgetCategories,
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      goalsProgress,
      totalWallets: wallets.length,
      totalTransactions: transactions.length,
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    if (!GEMINI_API_KEY?.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "⚠️ Gemini API key is not configured. To use the AI advisor:\n\n1. Get a free API key from https://makersuite.google.com/app/apikey\n2. Add it to your .env file as: VITE_GEMINI_API_KEY=your_key_here\n3. Restart your development server\n\nThis feature is optional!",
        },
      ])
      return
    }

    const userMessage = input.trim()
    setInput('')
    const newUserMessage = { role: 'user', content: userMessage }
    setMessages((prev) => [...prev, newUserMessage])
    
    // Save user message to database
    if (user?.id) {
      saveMessageMutation.mutate({
        user_id: user.id,
        role: 'user',
        content: userMessage,
      })
    }
    
    setLoading(true)

    try {
      const context = getFinancialContext()
      const systemPrompt = `You are Willy, a friendly financial mentor for high school students.

User: ${context.userName}
Balance: ${context.currentBalance} | Income: ${context.monthlyIncome} | Expense: ${context.monthlyExpense} | Net: ${context.netFlow}
Top Expenses: ${context.topExpenseCategories}
Budgets: ${context.totalBudgets} active (${context.overBudgetCategories})
Goals: ${context.activeGoals}/${context.totalGoals} active - ${context.goalsProgress}

Guidelines:
- Use simple language, avoid jargon
- Be encouraging and supportive
- Give specific, actionable advice
- Reference their budgets and goals
- Keep responses concise (2-3 sentences)
- Use emojis sparingly

Question: ${userMessage}`

      const cleanPrompt = systemPrompt.replace(/\n{3,}/g, '\n\n').substring(0, 30000)

      const response = await fetch(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: cleanPrompt,
                  },
                ],
              },
            ],
          }),
        }
      )

      if (!response.ok) {
        let errorMessage = `⚠️ HTTP Error ${response.status}`
        
        try {
          const errorData = await response.json()
          if (errorData.error?.message) {
            errorMessage = `⚠️ ${errorData.error.message}`
          }
        } catch {
          if (response.status === 401 || response.status === 403) {
            errorMessage = "⚠️ Invalid API key. Check https://makersuite.google.com/app/apikey"
          } else if (response.status === 429) {
            errorMessage = "⚠️ Too many requests. Please wait and try again."
          } else if (response.status >= 500) {
            errorMessage = "⚠️ Service temporarily unavailable. Please try again later."
          }
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message || 'API returned an error')
      }
      
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text
      
      if (!aiResponse?.trim()) {
        throw new Error('No response generated from AI')
      }

      const newAssistantMessage = { role: 'assistant', content: aiResponse }
      setMessages((prev) => [...prev, newAssistantMessage])
      
      // Save assistant message to database
      if (user?.id) {
        saveMessageMutation.mutate({
          user_id: user.id,
          role: 'assistant',
          content: aiResponse,
        })
      }
    } catch (error) {
      console.error('Gemini API Error:', error)
      
      let errorMessage = "⚠️ Error connecting to AI service."
      
      if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        errorMessage = "⚠️ Network error. Check your internet connection."
      } else if (error?.message && error.message.startsWith('⚠️')) {
        errorMessage = error.message
      } else if (error?.message) {
        errorMessage = `⚠️ ${error.message}`
      }
      
      const errorAssistantMessage = { role: 'assistant', content: errorMessage }
      setMessages((prev) => [...prev, errorAssistantMessage])
      
      // Save error message to database
      if (user?.id) {
        saveMessageMutation.mutate({
          user_id: user.id,
          role: 'assistant',
          content: errorMessage,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl font-bold text-white glow-text">AI Financial Advisor</h1>
        <p className="text-white/70 mt-1 text-sm sm:text-base">Get personalized financial advice from Willy</p>
      </div>

      {!GEMINI_API_KEY && (
        <Card className="bg-yellow-500/20 border-yellow-500/50 animate-fade-in-up">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Bot className="h-5 w-5 text-yellow-400 mt-0.5" />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-300 mb-1">API Key Not Configured</h3>
              <p className="text-sm text-yellow-200">
                To use the AI advisor, you need a Gemini API key. Get a free key from{' '}
                <a 
                  href="https://makersuite.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-yellow-100 font-medium"
                >
                  Google AI Studio
                </a>
                {' '}and add it to your .env file as <code className="bg-yellow-500/30 px-1 rounded text-yellow-100">VITE_GEMINI_API_KEY</code>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Chat History Header with Clear Button */}
      {messages.length > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 animate-fade-in-up">
          <p className="text-xs sm:text-sm text-white/70">
            {messages.length} messages in this conversation
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
                try {
                  await clearChatMutation.mutateAsync({ user_id: user.id })
                  setMessages([
                    {
                      role: 'assistant',
                      content: "Hi! I'm Willy, your financial mentor. I'm here to help you manage your money better. Ask me anything about your finances! 💰",
                    },
                  ])
                  setIsInitialized(false)
                } catch (error) {
                  alert('Error clearing chat history: ' + error.message)
                }
              }
            }}
            disabled={clearChatMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {clearChatMutation.isPending ? 'Clearing...' : 'Clear History'}
          </Button>
        </div>
      )}

      <Card glow className="p-0 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="h-[calc(100vh-280px)] sm:h-[600px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-dark-bg/50 to-dark-card">
            {chatHistoryLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto shadow-glow-primary"></div>
                  <p className="mt-4 text-white/70">Loading chat history...</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
              <div
                key={index}
                className={`flex animate-fade-in-up ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div
                  className={`flex items-start space-x-2 sm:space-x-3 max-w-[85%] sm:max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md transition-transform duration-300 hover:scale-110 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-primary-dark text-white'
                        : 'bg-gradient-to-br from-primary-dark to-primary text-white'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User size={14} className="sm:w-[18px] sm:h-[18px]" />
                    ) : (
                      <Bot size={14} className="sm:w-[18px] sm:h-[18px]" />
                    )}
                  </div>
                  <div
                    className={`rounded-xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-300 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-glow-purple'
                        : 'bg-dark-card text-white border border-dark-border'
                    }`}
                  >
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words">{message.content}</p>
                  </div>
                </div>
              </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-dark to-primary text-white flex items-center justify-center shadow-md">
                    <Bot size={18} />
                  </div>
                  <div className="bg-dark-card rounded-xl px-4 py-3 border border-dark-border">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-dark-border bg-dark-card/80 backdrop-blur-sm p-3 sm:p-4">
            <form onSubmit={handleSend} className="flex space-x-2">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Willy anything..."
                className="flex-1 text-sm sm:text-base"
                disabled={loading || !GEMINI_API_KEY}
              />
              <Button 
                type="submit" 
                disabled={loading || !input.trim() || !GEMINI_API_KEY}
                className="flex-shrink-0 px-3 sm:px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  )
}

