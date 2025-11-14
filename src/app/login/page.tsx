'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('gobi_demo');
  const [password, setPassword] = useState('12345');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('https://tnfl2-cb6ea45c64b3.herokuapp.com/services/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          sessionStorage.setItem('accessToken', data.accessToken);
          toast({
            title: 'Login Successful',
            description: 'Redirecting to your dashboard...',
          });
          router.push('/');
        } else {
            throw new Error('Access token not found in response.');
        }

      } else {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: 'Login Failed',
          description: errorData.message || 'Invalid credentials. Please try again.',
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: 'An Error Occurred',
        description: error.message || 'Could not connect to the server. Please try again later.',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
                <div className="bg-primary text-primary-foreground p-3 rounded-lg shadow-md">
                    <Wallet className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold text-foreground font-headline tracking-tight">
                LedgerLink
                </h1>
            </div>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Username</Label>
              <Input
                id="email"
                type="text"
                placeholder="gobi_demo"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
