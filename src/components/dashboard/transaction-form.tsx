"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Party, Balances } from '@/app/page';
import { parties } from '@/app/page';

type TransactionFormProps = {
  onTransaction: (from: Party, to: Party, amount: number) => boolean;
  balances: Balances;
};

const createTransactionSchema = (balances: Balances) => z.object({
  from: z.custom<Party>(val => typeof val === 'string' && val in parties, "Please select a source."),
  to: z.custom<Party>(val => typeof val === 'string' && val in parties, "Please select a destination."),
  amount: z.coerce.number().positive("Amount must be positive."),
}).refine(data => data.from !== data.to, {
  message: "Source and destination cannot be the same.",
  path: ["to"],
});

type TransactionSchema = z.infer<ReturnType<typeof createTransactionSchema>>;

const partyOptions = (Object.keys(parties) as Party[]).map(p => ({
  value: p,
  label: parties[p].name,
}));

function GeneralTransactionForm({ onTransaction }: { onTransaction: TransactionFormProps['onTransaction']}) {
  const form = useForm<TransactionSchema>({
    resolver: zodResolver(createTransactionSchema({} as Balances)), // Balances check is done in parent
    defaultValues: { amount: 0 },
  });

  function onSubmit(data: TransactionSchema) {
    const success = onTransaction(data.from, data.to, data.amount);
    if (success) {
      form.reset({ amount: 0, from: undefined, to: undefined });
    }
  }
  
  return (
     <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {partyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a destination" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {partyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Transfer <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </Form>
  )
}

const createQuickTransferSchema = () => z.object({
  amount: z.coerce.number().positive("Amount must be positive."),
});

type QuickTransferSchema = z.infer<ReturnType<typeof createQuickTransferSchema>>;

function QuickTransferForm({ from, to, onTransaction }: { from: Party, to: Party, onTransaction: TransactionFormProps['onTransaction']}) {
  const form = useForm<QuickTransferSchema>({
    resolver: zodResolver(createQuickTransferSchema()),
    defaultValues: { amount: 0 },
  });

  function onSubmit(data: QuickTransferSchema) {
    const success = onTransaction(from, to, data.amount);
    if(success) {
      form.reset({ amount: 0 });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
            Transfer from <strong>{parties[from].name}</strong> to <strong>{parties[to].name}</strong>.
        </p>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Confirm Transfer <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </Form>
  )
}

export default function TransactionForm({ onTransaction, balances }: TransactionFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a Transaction</CardTitle>
        <CardDescription>Record a new transfer between accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="cash-to-bank">Cash to Bank</TabsTrigger>
            <TabsTrigger value="bank-to-tasmac">Bank to Tasmac</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="pt-6">
            <GeneralTransactionForm onTransaction={onTransaction} />
          </TabsContent>
          <TabsContent value="cash-to-bank" className="pt-6">
            <QuickTransferForm from="cashInHand" to="bank" onTransaction={onTransaction} />
          </TabsContent>
          <TabsContent value="bank-to-tasmac" className="pt-6">
            <QuickTransferForm from="bank" to="tasmac" onTransaction={onTransaction} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
