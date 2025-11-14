"use client";

import { useState } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';

import { getAccountBalanceSummary } from '@/ai/flows/account-balance-summary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Balances } from '@/app/page';
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from 'framer-motion';

interface BalanceSummaryProps {
  balances: Balances;
}

export default function BalanceSummary({ balances }: BalanceSummaryProps) {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchSummary = async () => {
    setIsLoading(true);
    setSummary('');
    try {
      const result = await getAccountBalanceSummary({
        bankBalance: balances.bank,
        tasmacBalance: balances.tasmac,
        cashInHandBalance: balances.cashInHand,
        stockBalance: balances.stock,
        externalFactors: 'Standard economic conditions.',
      });
      setSummary(result.summary);
    } catch (error) {
      console.error('Failed to get AI summary:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate AI summary. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>AI Financial Summary</CardTitle>
        <CardDescription>Get an AI-powered summary of your current financial standing.</CardDescription>
      </CardHeader>
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent>
              <Alert className="bg-accent/20 border-accent/50">
                <Bot className="h-4 w-4 text-accent-foreground" />
                <AlertTitle className="text-accent-foreground">Analysis</AlertTitle>
                <AlertDescription className="text-accent-foreground/90">
                  {summary}
                </AlertDescription>
              </Alert>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
      <CardFooter className="mt-auto">
        <Button onClick={fetchSummary} disabled={isLoading} variant="outline" className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
             <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Summary
             </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
