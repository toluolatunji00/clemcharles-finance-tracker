import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

export default function AdminDashboard({ user }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
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

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return ''
    return Number(value).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }
  
  

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  useEffect(() => {
    checkEmailVerified()
  }, [])
  
  useEffect(() => {
    fetchTransactions()
  }, [selectedUser])

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
  
    let query = supabase
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
      .range(0, 5000)
  
    if (selectedUser) {
      query = query.eq('user_id', selectedUser)
    }
  
    const { data, error } = await query
  
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

  const startEdit = (tx) => {
    console.log("EDIT CLICKED", tx.id)
    
    setEditingId(tx.id)
    setEditForm({
      transaction_date: tx.transaction_date,
      recipient: tx.recipient,
      amount: tx.amount,
      creditor: tx.creditor,
      bank: tx.bank,
      description: tx.description,
      project: tx.project
    })
  }
  
  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }
  
  const saveEdit = async (id) => {
    try {
      console.log("SAVING:", editForm)
  
      const { data, error } = await supabase
        .from('transactions')
        .update({
          transaction_date: editForm.transaction_date,
          recipient: editForm.recipient,
          amount: Number(editForm.amount),
          creditor: editForm.creditor,
          bank: editForm.bank,
          description: editForm.description,
          project: editForm.project
        })
        .eq('id', id)
        .select()
  
      console.log("UPDATE RESULT:", data)
      console.log("UPDATE ERROR:", error)
  
      if (error) throw error
  
      await fetchTransactions()
  
      setEditingId(null)
      setEditForm({})
    } catch (err) {
      console.error("SAVE ERROR:", err)
      setError(err.message)
    }
  }
  

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export')
      return
    }
  
    const headers = [
      'Date',
      'User Email',
      'Recipient',
      'Amount',
      'Creditor',
      'Bank',
      'Description',
      'Project'
    ]
  
    const rows = filteredTransactions.map(tx => [
      tx.transaction_date,
      tx.user?.email || '',
      tx.recipient,
      formatCurrency(tx.amount),
      tx.creditor,
      tx.bank,
      tx.description || '',
      tx.project || ''
    ])
  
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
  
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'transactions.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  
  

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Dashboard</h2>
      <p>Logged in as: {user.email}</p>
      <button onClick={handleLogout}>Log out</button>

      <p>Total fetched: {transactions.length}</p>
      <p>Total displayed: {filteredTransactions.length}</p>
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

      <h3>Filter by User</h3>
      <select
  value={selectedUser}
  onChange={(e) => setSelectedUser(e.target.value)}
>
  
      <option value="">All Users</option>

      {[...new Map(
      transactions.map(tx => [tx.user_id, tx.user?.email])
      ).entries()].map(([id, email]) => (
      <option key={id} value={id}>
      {email}
      </option>
      ))}
      </select>


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


     <h3>Total Amount: ₦{formatCurrency(totalAmount)}</h3>


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

      <button onClick={exportToCSV} style={{ marginBottom: '10px' }}>
  Export to CSV
      </button>


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
  <td>
  {editingId === tx.id ? (
    <input
      type="date"
      name="transaction_date"
      value={editForm.transaction_date}
      onChange={(e) =>
        setEditForm({ ...editForm, transaction_date: e.target.value })
      }
    />
  ) : (
    tx.transaction_date
  )}
  </td>
  <td>{tx.user?.email}</td>
  <td>
        {editingId === tx.id ? (
          <input
            name="recipient"
            value={editForm.recipient}
            onChange={handleEditChange}
          />
        ) : (
          tx.recipient
        )}
  </td>
  <td>
    {editingId === tx.id ? (
      <input
        type="number"
        name="amount"
        value={editForm.amount}
        onChange={handleEditChange}
      />
    ) : (
      `₦${formatCurrency(tx.amount)}`
    )}
  </td>

<td>
        {editingId === tx.id ? (
          <input
            name="creditor"
            value={editForm.creditor}
            onChange={handleEditChange}
          />
        ) : (
          tx.creditor
        )}
  </td>
  <td>
        {editingId === tx.id ? (
          <input
            name="bank"
            value={editForm.bank}
            onChange={handleEditChange}
          />
        ) : (
          tx.bank
        )}
  </td>
  <td>
        {editingId === tx.id ? (
          <input
            name="description"
            value={editForm.description}
            onChange={handleEditChange}
          />
        ) : (
          tx.description
        )}
  </td>
  <td>
        {editingId === tx.id ? (
          <input
            name="project"
            value={editForm.project}
            onChange={handleEditChange}
          />
        ) : (
          tx.project
        )}
  </td>
  <td>
        {editingId === tx.id ? (
          <>
            <button type="button" onClick={() => saveEdit(tx.id)}>Save</button>
            <button type="button" onClick={cancelEdit}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => startEdit(tx)}>Edit</button>
            <button type="button" onClick={() => handleDelete(tx.id)}>Delete</button>
          </>
        )}
  </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
