import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/use-supabase-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Mail, AlertCircle, Loader2 } from 'lucide-react';

const EmailConfirmedPage = () => {
  const [, setLocation] = useLocation();
  const { user, confirmEmail } = useAuth();
  const [isConfirming, setIsConfirming] = useState(true);
  const [confirmationStatus, setConfirmationStatus] = useState<'loading' | 'success' | 'error' | 'already_confirmed'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the token and type from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const type = urlParams.get('type');

        console.log('📧 Email confirmation attempt:', { token: token?.substring(0, 10) + '...', type });

        if (!token || type !== 'signup') {
          setConfirmationStatus('error');
          setErrorMessage('Invalid confirmation link. Please check your email for the correct link.');
          setIsConfirming(false);
          return;
        }

        // Check if user is already confirmed
        if (user?.email_confirmed_at) {
          console.log('✅ User already confirmed:', user.email);
          setConfirmationStatus('already_confirmed');
          setIsConfirming(false);
          return;
        }

        // Attempt to confirm the email
        const result = await confirmEmail(token);

        if (result.error) {
          console.error('❌ Email confirmation error:', result.error);
          setConfirmationStatus('error');
          setErrorMessage(result.error.message || 'Failed to confirm email. The link may have expired.');
        } else {
          console.log('✅ Email confirmed successfully:', result);
          setConfirmationStatus('success');

          // Auto-redirect to dashboard after success
          setTimeout(() => {
            setLocation('/rewards');
          }, 3000);
        }
      } catch (error) {
        console.error('❌ Email confirmation exception:', error);
        setConfirmationStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      } finally {
        setIsConfirming(false);
      }
    };

    handleEmailConfirmation();
  }, [confirmEmail, user, setLocation]);

  const getStatusContent = () => {
    switch (confirmationStatus) {
      case 'loading':
        return {
          icon: <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />,
          title: 'Confirming Your Email...',
          description: 'Please wait while we verify your email address.',
          buttonText: null,
          buttonAction: null,
          bgColor: 'bg-blue-50',
          titleColor: 'text-blue-900'
        };

      case 'success':
        return {
          icon: <Check className="w-16 h-16 text-green-600" />,
          title: 'Email Confirmed Successfully! 🎉',
          description: 'Welcome to Favilla\'s NY Pizza! Your account is now active and you can start earning reward points. You\'ll be redirected to your rewards dashboard in a moment.',
          buttonText: 'Go to Rewards Dashboard',
          buttonAction: () => setLocation('/rewards'),
          bgColor: 'bg-green-50',
          titleColor: 'text-green-900'
        };

      case 'already_confirmed':
        return {
          icon: <Check className="w-16 h-16 text-green-600" />,
          title: 'Email Already Confirmed',
          description: 'Your email address has already been verified. You can continue using your account normally.',
          buttonText: 'Go to Dashboard',
          buttonAction: () => setLocation('/rewards'),
          bgColor: 'bg-green-50',
          titleColor: 'text-green-900'
        };

      case 'error':
        return {
          icon: <AlertCircle className="w-16 h-16 text-red-600" />,
          title: 'Email Confirmation Failed',
          description: errorMessage || 'We couldn\'t confirm your email address. The link may have expired or already been used.',
          buttonText: 'Resend Confirmation Email',
          buttonAction: () => setLocation('/auth?mode=resend'),
          bgColor: 'bg-red-50',
          titleColor: 'text-red-900'
        };

      default:
        return null;
    }
  };

  const content = getStatusContent();

  if (!content) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Email Confirmation | Favilla's NY Pizza</title>
        <meta name="description" content="Confirm your email address to activate your Favilla's NY Pizza rewards account." />
      </Helmet>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="shadow-lg">
            <CardHeader className={`text-center ${content.bgColor} rounded-t-lg`}>
              <div className="flex justify-center mb-4">
                {content.icon}
              </div>
              <CardTitle className={`text-2xl ${content.titleColor}`}>
                {content.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-6 leading-relaxed">
                {content.description}
              </p>

              {confirmationStatus === 'success' && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Mail className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="font-medium text-yellow-800">What's Next?</span>
                  </div>
                  <ul className="text-sm text-yellow-700 text-left space-y-1">
                    <li>• Start earning 1 point per $1 spent</li>
                    <li>• Check out available rewards</li>
                    <li>• Update your profile preferences</li>
                    <li>• Enjoy exclusive member offers</li>
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                {content.buttonText && content.buttonAction && (
                  <Button
                    onClick={content.buttonAction}
                    className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white font-medium py-3"
                    disabled={isConfirming}
                  >
                    {content.buttonText}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setLocation('/')}
                  className="w-full"
                  disabled={isConfirming}
                >
                  Return to Home
                </Button>
              </div>

              {confirmationStatus === 'error' && (
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Need help?</strong> Contact our support team at{' '}
                    <a href="mailto:support@favillaspizza.com" className="text-[#d73a31] hover:underline">
                      support@favillaspizza.com
                    </a>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Branding Footer */}
          <div className="text-center mt-6">
            <p className="text-gray-500 text-sm">
              🍕 Favilla's NY Pizza - Authentic New York Style
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailConfirmedPage;