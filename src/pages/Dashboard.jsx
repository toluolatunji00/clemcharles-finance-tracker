import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

export default function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({
    transaction_date: '',
    recipient: '',
    amount: '',
    creditor: '',
    bank: '',
    description: '',
    project: '',
    user_id: ''
  })
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [emailVerified, setEmailVerified] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      await checkEmailVerified()
      await checkAdminRole()
      await fetchTransactions()
      setLoading(false)
    }
    initialize()
  }, [user.id])

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

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

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!error && data?.role === 'admin') {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    } catch (err) {
      console.error('Admin check failed:', err)
      setIsAdmin(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
      
      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err.message)
    }
  }

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from('transactions')
        .select('*, profiles(email)')

      if (!isAdmin) {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err.message)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!emailVerified) {
      setError('❌ You must verify your email before adding transactions. Please check your inbox for the verification email.')
      return
    }

    if (isAdmin && !form.user_id) {
      setError('Admin must select a user')
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
        user_id: isAdmin ? form.user_id : user.id
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
        project: '',
        user_id: ''
      })
      await fetchTransactions()
    } catch (err) {
      setError(err.message)
      console.error('Insert error:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      let query = supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (!isAdmin) {
        query = query.eq('user_id', user.id)
      }

      const { error } = await query
      if (error) throw error
      
      await fetchTransactions()
    } catch (err) {
      setError(err.message)
      console.error('Delete error:', err)
    }
  }
  
  if (loading) return <div>Loading...</div>

  return (
    <div style={{ padding: '20px' }}>
      <h1>{isAdmin ? 'Admin Dashboard' : 'User Dashboard'}</h1>
      <p>Logged in as: {user.email}</p>
      
      {!emailVerified && (
        <div style={{ backgroundColor: '#ffe6e6', padding: '15px', borderRadius: '5px', marginBottom: '20px', borderLeft: '4px solid #cc0000' }}>
          <p style={{ color: '#cc0000', margin: 0, fontSize: '16px' }}>
            ⚠️ <strong>Email Verification Required</strong><br/>
            Please check your inbox and click the verification link we sent to activate your account.
          </p>
        </div>
      )}
      
      <button onClick={handleLogout}>Log out</button>

      <h3>Add Transaction</h3>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', opacity: emailVerified ? 1 : 0.5 }}>
        {isAdmin && (
          <>
            <label>Select User: </label>
            <select name="user_id" value={form.user_id} onChange={handleChange} required disabled={!emailVerified}>
              <option value="">-- Choose User ({users.length} available) --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select><br/><br/>
          </>
        )}
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

      <h3>{isAdmin ? 'All Transactions' : 'Your Transactions'}</h3>
      {transactions.length === 0 ? (
        <p>No transactions found</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Date</th>
              {isAdmin && <th style={{ border: '1px solid #ddd', padding: '8px' }}>User</th>}
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Recipient</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Amount</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Creditor</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Bank</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Description</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Project</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tx.transaction_date}</td>
                {isAdmin && <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tx.profiles?.email}</td>}
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tx.recipient}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tx.amount}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tx.creditor}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tx.bank}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tx.description}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tx.project}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button onClick={() => handleDelete(tx.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
