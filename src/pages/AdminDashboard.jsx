import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

export default function AdminDashboard({ user }) {
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [form, setForm] = useState({
    transaction_date: '',
    recipient: '',
    amount: '',
    creditor: '',
    bank: '',
    description: '',
    project: ''
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  useEffect(() => {
    checkEmailVerified()
    fetchTransactions()
  }, [])

  const checkEmailVerified = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setEmailVerified(true)
      } else {
        setEmailVerified(false)
      }
    } catch (err) {
      console.error('Email verification check failed:', err)
      setEmailVerified(false)
    }
  }

  const fetchTransactions = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_date,
        recipient,
        amount,
        creditor,
        bank,
        description,
        project,
        user_id,
        user:profiles(email)
      `)
      .order('transaction_date', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setTransactions(data)
    }

    setLoading(false)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!emailVerified) {
      setError('❌ Please verify your email first before adding transactions.')
      return
    }

    try {
      const transactionData = {
        transaction_date: form.transaction_date,
        recipient: form.recipient,
        amount: parseFloat(form.amount),
        creditor: form.creditor,
        bank: form.bank,
        description: form.description,
        project: form.project,
        user_id: user.id
      }

      const { error } = await supabase
        .from('transactions')
        .insert([transactionData])

      if (error) throw error
      
      setError('')
      setForm({
        transaction_date: '',
        recipient: '',
        amount: '',
        creditor: '',
        bank: '',
        description: '',
        project: ''
      })
      await fetchTransactions()
    } catch (err) {
      setError(err.message)
      console.error('Insert error:', err)
    }
  }

  // Filter by description (case-insensitive)
  const filteredTransactions = transactions.filter(tx => {
    const descMatch = tx.description?.toLowerCase().includes(filter.toLowerCase())
    const projectMatch = tx.project?.toLowerCase().includes(projectFilter.toLowerCase())

  
    let dateMatch = true
    if (startDate) dateMatch = new Date(tx.transaction_date) >= new Date(startDate)
    if (endDate) dateMatch = dateMatch && new Date(tx.transaction_date) <= new Date(endDate)
  
    return descMatch && projectMatch && dateMatch
  })
  
  // Sum total amount
  const totalAmount = filteredTransactions.reduce(
    (sum, tx) => sum + Number(tx.amount),
    0
  )

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
    
      if (error) throw error
      await fetchTransactions()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Dashboard</h2>
      <p>Logged in as: {user.email}</p>
      <button onClick={handleLogout}>Log out</button>

      <h3>Add Transaction</h3>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <input type="date" name="transaction_date" value={form.transaction_date} onChange={handleChange} required disabled={!emailVerified} /><br/>
        <input type="text" name="recipient" placeholder="Recipient" value={form.recipient} onChange={handleChange} required disabled={!emailVerified} /><br/>
        <input type="number" name="amount" placeholder="Amount" value={form.amount} onChange={handleChange} required disabled={!emailVerified} /><br/>
        <input type="text" name="creditor" placeholder="Creditor" value={form.creditor} onChange={handleChange} required disabled={!emailVerified} /><br/>
        <input type="text" name="bank" placeholder="Bank" value={form.bank} onChange={handleChange} required disabled={!emailVerified} /><br/>
        <input type="text" name="description" placeholder="Description" value={form.description} onChange={handleChange} disabled={!emailVerified} /><br/><br/>
        <input type="text" name="project" placeholder="Project" value={form.project} onChange={handleChange} disabled={!emailVerified} /><br/><br/>
        <button type="submit" disabled={!emailVerified}>Add Transaction</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h3>Filter by Description</h3>
      <input
        type="text"
        placeholder="Search description..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

     <h3>Filter by Project</h3>
     <input
      type="text"
      placeholder="Search project..."
      value={projectFilter}
      onChange={(e) => setProjectFilter(e.target.value)}
    />


      <h3>Total Amount: #{totalAmount.toFixed(2)}</h3>

      {loading && <p>Loading transactions...</p>}

      <h3>Filter by Date</h3>
      <label>
        From: 
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
        />
      </label>
      <label style={{ marginLeft: '10px' }}>
        To: 
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
        />
      </label>

      <h3>All Transactions</h3>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Date</th>
            <th>User</th>
            <th>Recipient</th>
            <th>Amount</th>
            <th>Creditor</th>
            <th>Bank</th>
            <th>Description</th>
            <th>Project</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map(tx => (
            <tr key={tx.id}>
              <td>{tx.transaction_date}</td>
              <td>{tx.user?.email}</td>
              <td>{tx.recipient}</td>
              <td>{tx.amount}</td>
              <td>{tx.creditor}</td>
              <td>{tx.bank}</td>
              <td>{tx.description}</td>
              <td>{tx.project}</td>
              <td><button onClick={() => handleDelete(tx.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
