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
import { getPartyDetails, type Party } from '@/app/lib/parties';
import type { Balances } from '@/app/lib/types';
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


type TransactionFormProps = {
  onTransaction: (from: Party, to: Party, amount: number, date: Date, description?: string) => Promise<boolean>;
  balances: Balances;
  isSubmitting: boolean;
};

const createTransferSchema = (allParties: Party[], fromDisabled?: boolean, toDisabled?: boolean) => z.object({
  from: z.string().min(1, "Source account is required."),
  to: z.string().min(1, "Destination account is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  date: z.date({
    required_error: "A date is required.",
  }),
}).refine(data => data.from !== data.to, {
  message: "Source and destination cannot be the same.",
  path: ["to"],
});

type TransferSchema = z.infer<ReturnType<typeof createTransferSchema>>;


function GeneralTransferForm({ onTransaction, balances, isSubmitting }: TransactionFormProps) {
  const allParties = Object.keys(balances);
  const form = useForm<TransferSchema>({
    resolver: zodResolver(createTransferSchema(allParties)),
    defaultValues: { amount: undefined, date: new Date(), from: undefined, to: undefined },
  });

  async function onSubmit(data: TransferSchema) {
    const success = await onTransaction(data.from, data.to, data.amount, data.date);
    if(success) {
      form.reset({ amount: undefined, date: new Date(), from: undefined, to: undefined });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allParties.map(party => (
                            <SelectItem key={party} value={party}>{getPartyDetails(party).name}</SelectItem>
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
                  <FormLabel>To Account</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a destination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allParties.map(party => (
                            <SelectItem key={party} value={party}>{getPartyDetails(party).name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} disabled={isSubmitting} />
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
                           disabled={isSubmitting}
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Confirm Transfer'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </Form>
  )
}


const createDeductionSchema = (allParties: Party[]) => z.object({
  from: z.string().min(1, "Source account is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  description: z.string().min(1, "Description is required."),
  date: z.date({
    required_error: "A date is required.",
  }),
});
type DeductionSchema = z.infer<ReturnType<typeof createDeductionSchema>>;


function DeductionForm({ onTransaction, balances, isSubmitting }: { onTransaction: TransactionFormProps['onTransaction'], balances: Balances, isSubmitting: boolean }) {
  const allParties = Object.keys(balances);
  const form = useForm<DeductionSchema>({
    resolver: zodResolver(createDeductionSchema(allParties)),
    defaultValues: { from: undefined, amount: undefined, description: "", date: new Date() },
  });

  async function onSubmit(data: DeductionSchema) {
    const success = await onTransaction(data.from, 'expenses', data.amount, data.date, data.description);
    if (success) {
      form.reset({ from: undefined, amount: undefined, description: "", date: new Date() });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a source account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allParties.map(party => (
                            <SelectItem key={party} value={party}>{getPartyDetails(party).name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
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
                          disabled={isSubmitting}
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Bank Annual Charges" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Log Deduction'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </Form>
  )
}


export default function TransactionForm({ onTransaction, balances, isSubmitting }: TransactionFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a Transaction</CardTitle>
        <CardDescription>Record a new transfer or deduction.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transfer" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transfer" disabled={isSubmitting}>Transfer</TabsTrigger>
            <TabsTrigger value="deduction" disabled={isSubmitting}>Deduction</TabsTrigger>
          </TabsList>
          <TabsContent value="transfer" className="pt-6">
            <GeneralTransferForm onTransaction={onTransaction} balances={balances} isSubmitting={isSubmitting}/>
          </TabsContent>
          <TabsContent value="deduction" className="pt-6">
            <DeductionForm onTransaction={onTransaction} balances={balances} isSubmitting={isSubmitting}/>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
