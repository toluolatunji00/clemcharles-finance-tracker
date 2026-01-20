import { useState } from 'react'
import { supabase } from '../supabase'

export default function Signup({ onSignup }) {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check if email already exists in profiles table
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single()

      if (existingProfile) {
        setError('❌ This email is already registered. Please log in instead, or check your inbox to verify your account.')
        setLoading(false)
        return
      }

      // Sign up user (auto-sends confirmation email)
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`
        }
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Signup failed. Please try again.')
        setLoading(false)
        return
      }

      // Show success message
      setSignupSuccess(true)
      setEmail('')
      setPassword('')
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (signupSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h2>✅ Signup successful!</h2>
        <p>A confirmation email has been sent.</p>
        <p>Please check your inbox and click the verification link to complete your signup.</p>
        <button onClick={() => setSignupSuccess(false)}>Back to Signup</button>
      </div>
    )
  }

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        /><br/>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        /><br/>
        <button type="submit" disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
