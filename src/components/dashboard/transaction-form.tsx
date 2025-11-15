"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowRight, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


type TransactionFormProps = {
  onTransaction: (from: Party, to: Party, amount: number, date: Date, description?: string) => boolean;
  balances: Balances;
};


const createQuickTransferSchema = () => z.object({
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date({
    required_error: "A date is required.",
  }),
});

type QuickTransferSchema = z.infer<ReturnType<typeof createQuickTransferSchema>>;

function QuickTransferForm({ from, to, onTransaction }: { from: Party, to: Party, onTransaction: TransactionFormProps['onTransaction']}) {
  const form = useForm<QuickTransferSchema>({
    resolver: zodResolver(createQuickTransferSchema()),
    defaultValues: { amount: 0, date: new Date() },
  });

  function onSubmit(data: QuickTransferSchema) {
    const success = onTransaction(from, to, data.amount, data.date);
    if(success) {
      form.reset({ amount: 0, date: new Date() });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
            Transfer from <strong>{parties[from].name}</strong> to <strong>{parties[to].name}</strong>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Transaction Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
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
  date: z.date({
    required_error: "A date is required.",
  }),
});
type DeductionSchema = z.infer<ReturnType<typeof createDeductionSchema>>;


function DeductionForm({ onTransaction }: { onTransaction: TransactionFormProps['onTransaction'] }) {
  const form = useForm<DeductionSchema>({
    resolver: zodResolver(createDeductionSchema()),
    defaultValues: { amount: 0, description: "", date: new Date() },
  });

  function onSubmit(data: DeductionSchema) {
    const success = onTransaction('bank', 'expenses', data.amount, data.date, data.description);
    if (success) {
      form.reset({ amount: 0, description: "", date: new Date() });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Deduct an expense from <strong>{parties.bank.name}</strong>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Transaction Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
        </div>
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
