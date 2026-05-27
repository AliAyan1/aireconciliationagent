"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  buildBankAmountIndex,
  buildLedgerAmountIndex,
  type AmountPoolIndex,
} from "@/lib/amount-hover-stats";
import type { BankTransaction, LedgerEntry } from "@/lib/types";

interface AmountHoverContextValue {
  bank: AmountPoolIndex | null;
  ledger: AmountPoolIndex | null;
}

const AmountHoverContext = createContext<AmountHoverContextValue>({
  bank: null,
  ledger: null,
});

export function useAmountHoverContext() {
  return useContext(AmountHoverContext);
}

interface AmountHoverProviderProps {
  bankData?: BankTransaction[];
  ledgerData?: LedgerEntry[];
  children: ReactNode;
}

export function AmountHoverProvider({
  bankData = [],
  ledgerData = [],
  children,
}: AmountHoverProviderProps) {
  const value = useMemo(
    () => ({
      bank: bankData.length > 0 ? buildBankAmountIndex(bankData) : null,
      ledger:
        ledgerData.length > 0 ? buildLedgerAmountIndex(ledgerData) : null,
    }),
    [bankData, ledgerData]
  );

  return (
    <AmountHoverContext.Provider value={value}>
      {children}
    </AmountHoverContext.Provider>
  );
}
