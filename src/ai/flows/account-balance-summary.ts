'use server';

/**
 * @fileOverview Provides a summary of account balances for Bank, Tasmac, Cash in Hand, and Stock.
 *
 * - getAccountBalanceSummary - A function that retrieves and summarizes the account balances.
 * - AccountBalanceSummaryInput - The input type for the getAccountBalanceSummary function.
 * - AccountBalanceSummaryOutput - The return type for the getAccountBalanceSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AccountBalanceSummaryInputSchema = z.object({
  bankBalance: z.number().describe('Current balance of the bank account.'),
  tasmacBalance: z.number().describe('Current balance of the Tasmac account.'),
  cashInHandBalance: z.number().describe('Current cash in hand balance.'),
  stockBalance: z.number().describe('Current stock balance.'),
  externalFactors: z
    .string()
    .describe(
      'Any external factors that might influence the display of balance information.'
    ),
});
export type AccountBalanceSummaryInput = z.infer<
  typeof AccountBalanceSummaryInputSchema
>;

const AccountBalanceSummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A summary of the current balances for Bank, Tasmac, Cash in Hand, and Stock, considering external factors.'
    ),
});
export type AccountBalanceSummaryOutput = z.infer<
  typeof AccountBalanceSummaryOutputSchema
>;

export async function getAccountBalanceSummary(
  input: AccountBalanceSummaryInput
): Promise<AccountBalanceSummaryOutput> {
  return accountBalanceSummaryFlow(input);
}

const accountBalanceSummaryPrompt = ai.definePrompt({
  name: 'accountBalanceSummaryPrompt',
  input: {schema: AccountBalanceSummaryInputSchema},
  output: {schema: AccountBalanceSummaryOutputSchema},
  prompt: `You are an expert financial analyst providing a summary of account balances for different entities.

  Based on the provided balances and external factors, create a concise and informative summary.  Consider the external factors when deciding what information to emphasize.

  Bank Balance: {{{bankBalance}}}
  Tasmac Balance: {{{tasmacBalance}}}
  Cash in Hand Balance: {{{cashInHandBalance}}}
  Stock Balance: {{{stockBalance}}}
  External Factors: {{{externalFactors}}}

  Summary:`,
});

const accountBalanceSummaryFlow = ai.defineFlow(
  {
    name: 'accountBalanceSummaryFlow',
    inputSchema: AccountBalanceSummaryInputSchema,
    outputSchema: AccountBalanceSummaryOutputSchema,
  },
  async input => {
    const {output} = await accountBalanceSummaryPrompt(input);
    return output!;
  }
);
