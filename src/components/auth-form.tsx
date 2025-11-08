
'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  AuthError,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, KeyRound } from 'lucide-react';

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.8 0-5.18-1.88-6.04-4.42H2.34v2.84C4.13 20.98 7.79 23 12 23z" fill="#34A853"/>
        <path d="M5.96 14.25c-.21-.66-.33-1.35-.33-2.05s.12-1.39.33-2.05V7.31H2.34C1.5 8.82 1 10.45 1 12.1s.5 3.28 1.34 4.8l3.62-2.85z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.79 1 4.13 3.02 2.34 6.16l3.62 2.84c.86-2.54 3.24-4.42 6.04-4.42z" fill="#EA4335"/>
        <path d="M1 1h22v22H1z" fill="none"/>
    </svg>
);


export default function AuthForm() {
  const [step, setStep] = useState('email'); // 'email', 'password', or 'provider'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      router.push('/'); // Redirect if already logged in
    }
  }, [user, router]);

  const handleAuthError = (error: AuthError) => {
    setIsLoading(false);
    setIsGoogleLoading(false);
    let title = 'Authentication Error';
    let description = 'An unexpected error occurred. Please try again.';

    switch (error.code) {
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
            title = 'Sign-in Cancelled';
            description = 'The sign-in process was cancelled. Please try again when you’re ready.';
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            title = 'Invalid Credentials';
            description = 'The email or password you entered is incorrect.';
            break;
        case 'auth/missing-password':
            title = 'Missing Password';
            description = 'Please enter your password to continue.';
            break;
        case 'auth/email-already-in-use':
            title = 'Email In Use';
            description = 'This email is already associated with an account. Please sign in instead.';
            break;
        case 'auth/invalid-email':
            title = 'Invalid Email';
            description = 'Please enter a valid email address.';
            break;
        case 'auth/weak-password':
            title = 'Weak Password';
            description = 'Your password must be at least 6 characters long.';
            break;
        default:
            console.error('Firebase Auth Error:', error);
            break;
    }
    toast({ variant: 'destructive', title, description });
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email) return;
    setIsLoading(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email.trim());
      if (methods.includes('password') || methods.includes('google.com')) {
        setStep('provider'); // User exists, let them choose how to sign in
      } else {
        setStep('password'); // New user, prompt for password creation
      }
    } catch (error) {
      handleAuthError(error as AuthError);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error) {
      handleAuthError(error as AuthError);
    }
  };

  const handleEmailPasswordSignIn = async () => {
    if (!auth || !password) {
      toast({ variant: 'destructive', title: 'Missing Password', description: 'Please enter your password.' });
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      router.push('/');
    } catch (error) {
      handleAuthError(error as AuthError);
    }
  };
  
  const handleEmailPasswordSignUp = async () => {
    if (!auth || !password) {
        toast({ variant: 'destructive', title: 'Missing Password', description: 'Please enter a password to create an account.' });
        return;
    }
    if (password.length < 6) {
        toast({ variant: 'destructive', title: 'Weak Password', description: 'Your password must be at least 6 characters long.' });
        return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
        toast({
          title: 'Verification Email Sent',
          description: 'A verification link has been sent to your email address. Please verify your account.',
        });
      }
      router.push('/');
    } catch (error) {
      handleAuthError(error as AuthError);
    }
  };

  const resetState = () => {
    setStep('email');
    setPassword('');
  }

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <form onSubmit={handleEmailSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !email.trim()}>
                {isLoading ? 'Checking...' : 'Continue'}
              </Button>
            </div>
          </form>
        );
      case 'provider':
        return (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">Sign in to continue</p>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
              {isGoogleLoading ? 'Redirecting...' : <><GoogleIcon /> Continue with Google</>}
            </Button>
             <Button variant="outline" className="w-full" onClick={() => setStep('password')} >
              <Mail className="mr-2 h-4 w-4" />
              Continue with Email
            </Button>
            <Button variant="link" size="sm" onClick={() => { setStep('email'); setEmail(''); }}>
                Use a different email
            </Button>
          </div>
        );
      case 'password':
        const isPasswordInvalid = password.trim().length === 0;
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email-display">Email Address</Label>
                    <Input id="email-display" type="email" value={email} disabled />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        disabled={isLoading}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Button onClick={handleEmailPasswordSignIn} disabled={isLoading || isGoogleLoading || isPasswordInvalid}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                    <Button variant="secondary" onClick={handleEmailPasswordSignUp} disabled={isLoading || isGoogleLoading || isPasswordInvalid}>
                        {isLoading ? 'Creating...' : 'Create Account'}
                    </Button>
                </div>
                <Button variant="link" size="sm" onClick={resetState}>
                    Back to start
                </Button>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in or create an account to continue.</CardDescription>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>
    </div>
  );
}
