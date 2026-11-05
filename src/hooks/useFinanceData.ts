import { useCallback, useEffect, useState } from "react";
import {
  getAccounts,
  getAllTransactions,
  getCategoryBudgets,
  getCategories,
} from "@/services/db";
import { useFinanceStore } from "@/store/store";
import type {
  Account,
  Category,
  CategoryBudget,
  Transaction,
} from "@/types/types";

interface QueryState<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
}

function useFinanceQuery<T>(
  query: () => Promise<T>,
  initialData: T,
): QueryState<T> {
  const dataRevision = useFinanceStore((state) => state.dataRevision);
  const [state, setState] = useState<QueryState<T>>({
    data: initialData,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, isLoading: true, error: null }));
    query()
      .then((data) => {
        if (active) setState({ data, isLoading: false, error: null });
      })
      .catch((cause: unknown) => {
        if (active) {
          setState((current) => ({
            ...current,
            isLoading: false,
            error:
              cause instanceof Error ? cause.message : "Could not load data.",
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [dataRevision, query]);

  return state;
}

export function useAccounts() {
  const query = useCallback(async () => {
    const accounts = await getAccounts();
    return {
      accounts: accounts.filter((account) => !account.archived),
      archivedAccounts: accounts.filter((account) => account.archived),
    };
  }, []);
  return useFinanceQuery(query, {
    accounts: [] as Account[],
    archivedAccounts: [] as Account[],
  });
}

export function useAllTransactions() {
  return useFinanceQuery(getAllTransactions, [] as Transaction[]);
}

export function useCategories() {
  return useFinanceQuery(getCategories, [] as Category[]);
}

export function useCategoryBudgets() {
  return useFinanceQuery(getCategoryBudgets, [] as CategoryBudget[]);
}
