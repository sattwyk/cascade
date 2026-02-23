'use client';

import { createContext, ReactNode, useCallback, useContext, useReducer } from 'react';

interface EmployeeDashboardContextType {
  selectedStreamId: string | null;
  setSelectedStreamId: (id: string | null) => void;
  isWithdrawing: boolean;
  setIsWithdrawing: (value: boolean) => void;
  isRefreshingActivity: boolean;
  setIsRefreshingActivity: (value: boolean) => void;
  refreshActivityHandler: (() => Promise<void>) | null;
  setRefreshActivityHandler: (handler: (() => Promise<void>) | null) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const EmployeeDashboardContext = createContext<EmployeeDashboardContextType | undefined>(undefined);

type EmployeeDashboardState = {
  selectedStreamId: string | null;
  isWithdrawing: boolean;
  isRefreshingActivity: boolean;
  refreshActivityHandler: (() => Promise<void>) | null;
  refreshTrigger: number;
};

type EmployeeDashboardAction =
  | { type: 'set-selected-stream-id'; value: string | null }
  | { type: 'set-is-withdrawing'; value: boolean }
  | { type: 'set-is-refreshing-activity'; value: boolean }
  | { type: 'set-refresh-activity-handler'; value: (() => Promise<void>) | null }
  | { type: 'trigger-refresh' };

const initialEmployeeDashboardState: EmployeeDashboardState = {
  selectedStreamId: null,
  isWithdrawing: false,
  isRefreshingActivity: false,
  refreshActivityHandler: null,
  refreshTrigger: 0,
};

function employeeDashboardReducer(
  state: EmployeeDashboardState,
  action: EmployeeDashboardAction,
): EmployeeDashboardState {
  switch (action.type) {
    case 'set-selected-stream-id':
      return { ...state, selectedStreamId: action.value };
    case 'set-is-withdrawing':
      return { ...state, isWithdrawing: action.value };
    case 'set-is-refreshing-activity':
      return { ...state, isRefreshingActivity: action.value };
    case 'set-refresh-activity-handler':
      return { ...state, refreshActivityHandler: action.value };
    case 'trigger-refresh':
      return { ...state, refreshTrigger: state.refreshTrigger + 1 };
    default:
      return state;
  }
}

export function EmployeeDashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(employeeDashboardReducer, initialEmployeeDashboardState);

  const setSelectedStreamId = useCallback((id: string | null) => {
    dispatch({ type: 'set-selected-stream-id', value: id });
  }, []);

  const setIsWithdrawing = useCallback((value: boolean) => {
    dispatch({ type: 'set-is-withdrawing', value });
  }, []);

  const setIsRefreshingActivity = useCallback((value: boolean) => {
    dispatch({ type: 'set-is-refreshing-activity', value });
  }, []);

  const setRefreshActivityHandler = useCallback((handler: (() => Promise<void>) | null) => {
    dispatch({ type: 'set-refresh-activity-handler', value: handler });
  }, []);

  const triggerRefresh = useCallback(() => {
    dispatch({ type: 'trigger-refresh' });
  }, []);

  return (
    <EmployeeDashboardContext.Provider
      value={{
        selectedStreamId: state.selectedStreamId,
        setSelectedStreamId,
        isWithdrawing: state.isWithdrawing,
        setIsWithdrawing,
        isRefreshingActivity: state.isRefreshingActivity,
        setIsRefreshingActivity,
        refreshActivityHandler: state.refreshActivityHandler,
        setRefreshActivityHandler,
        refreshTrigger: state.refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </EmployeeDashboardContext.Provider>
  );
}

export function useEmployeeDashboard() {
  const context = useContext(EmployeeDashboardContext);
  if (!context) {
    throw new Error('useEmployeeDashboard must be used within EmployeeDashboardProvider');
  }
  return context;
}
