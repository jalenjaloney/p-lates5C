  import React, { useState } from 'react'
  import { Link, useNavigate } from 'react-router-dom'
  import { UserAuth } from '../context/AuthContext'

  const Signout = () => {
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { session, signOutUser } = UserAuth()
    const navigate = useNavigate()
    console.log(session)

    const handleSignOut = async (e) => {
      e.preventDefault()
      setLoading(true)
      try {
        await signOutUser()             // calls your Supabase wrapper
        navigate('/signin')             // redirect after sign-out
      } catch (err) {
        setError('Failed to sign out')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div>
        <form onSubmit={handleSignOut} className='max-w-md m-auto pt-24'>
          <h2 className='font-bold pb-2'>Sign Out</h2>
          <p>
            Want to log back in? <Link to="/signin">Sign In!</Link>
          </p>
          <div className="flex flex-col py-4">
            <button type="submit" disabled={loading} className="mt-4 w-full">
              {loading ? 'Signing Out...' : 'Sign Out'}
            </button>
            {error && <p className="text-red-600 text-center pt-4">{error}</p>}
          </div>
        </form>
      </div>
    )
  }

  export default Signout