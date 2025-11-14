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
import type { Party } from '@/app/lib/parties';
import { parties } from '@/app/lib/parties';
import type { Balances } from '@/app/lib/types';
import { Textarea } from "@/components/ui/textarea";

type TransactionFormProps = {
  onTransaction: (from: Party, to: Party, amount: number, description?: string) => boolean;
  balances: Balances;
};


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

const createDeductionSchema = () => z.object({
  amount: z.coerce.number().positive("Amount must be positive."),
  description: z.string().min(1, "Description is required."),
});
type DeductionSchema = z.infer<ReturnType<typeof createDeductionSchema>>;


function DeductionForm({ onTransaction }: { onTransaction: TransactionFormProps['onTransaction'] }) {
  const form = useForm<DeductionSchema>({
    resolver: zodResolver(createDeductionSchema()),
    defaultValues: { amount: 0, description: "" },
  });

  function onSubmit(data: DeductionSchema) {
    const success = onTransaction('bank', 'expenses', data.amount, data.description);
    if (success) {
      form.reset({ amount: 0, description: "" });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Deduct an expense from <strong>{parties.bank.name}</strong>.
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Bank Annual Charges" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Log Deduction <ArrowRight className="ml-2 h-4 w-4" />
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
        <CardDescription>Record a new transfer or deduction.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cash-to-bank" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash-to-bank">Cash to Bank</TabsTrigger>
            <TabsTrigger value="bank-to-tasmac">Bank to Tasmac</TabsTrigger>
            <TabsTrigger value="deduction">Deduction</TabsTrigger>
          </TabsList>
          <TabsContent value="cash-to-bank" className="pt-6">
            <QuickTransferForm from="cashInHand" to="bank" onTransaction={onTransaction} />
          </TabsContent>
          <TabsContent value="bank-to-tasmac" className="pt-6">
            <QuickTransferForm from="bank" to="tasmac" onTransaction={onTransaction} />
          </TabsContent>
          <TabsContent value="deduction" className="pt-6">
            <DeductionForm onTransaction={onTransaction} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
