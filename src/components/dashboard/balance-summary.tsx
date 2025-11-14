"use client";

import { useState, useEffect } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';

import { getAccountBalanceSummary } from '@/ai/flows/account-balance-summary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Balances } from '@/app/lib/types';
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

  useEffect(() => {
    fetchSummary();
  }, [balances]);

  return (
    <Card className="flex flex-col min-h-[220px]">
      <CardContent className="pt-6 flex-grow">
        <AnimatePresence>
          {isLoading && !summary && (
             <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full"
            >
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </motion.div>
          )}
          {summary && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="bg-transparent border-0">
                <Bot className="h-5 w-5 text-primary" />
                <AlertTitle className="font-bold text-lg text-foreground">AI Analysis</AlertTitle>
                <AlertDescription className="text-foreground/80">
                  {summary}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
