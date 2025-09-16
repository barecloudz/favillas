import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { mapSupabaseUser } from '@/lib/user-mapping'

export default function AuthCallback() {
  const [, navigate] = useLocation()
  const { toast } = useToast()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have tokens in the URL fragment
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        
        if (access_token && refresh_token) {
          // Set the session with the tokens from the URL fragment
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          
          if (error) {
            console.error('Error setting session:', error)
            toast({
              title: 'Authentication failed',
              description: error.message,
              variant: 'destructive',
            })
            navigate('/auth?error=auth_error')
            return
          }
          
          if (data.session) {
            const mappedUser = mapSupabaseUser(data.session.user)
            console.log('Authentication successful:', mappedUser)
            toast({
              title: 'Welcome!',
              description: `Welcome back, ${mappedUser?.firstName || 'User'}!`,
            })
            navigate('/')
          } else {
            console.log('No session found after setting tokens')
            navigate('/auth')
          }
        } else {
          // Fallback: try to get existing session
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Auth callback error:', error)
            navigate('/auth?error=auth_error')
            return
          }

          if (data.session) {
            const mappedUser = mapSupabaseUser(data.session.user)
            console.log('Authentication successful:', mappedUser)
            navigate('/')
          } else {
            console.log('No session found')
            navigate('/auth')
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        toast({
          title: 'Authentication failed',
          description: 'There was an error completing your sign-in.',
          variant: 'destructive',
        })
        navigate('/auth?error=auth_error')
      }
    }

    handleAuthCallback()
  }, [navigate, toast])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d73a31] mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Sign-In...</h2>
        <p className="text-gray-600">Please wait while we complete your authentication.</p>
      </div>
    </div>
  )
}
