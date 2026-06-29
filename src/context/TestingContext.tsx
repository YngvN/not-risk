import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  showAllMissions:  '@testing_show_missions',
  allowMapEditing:  '@testing_allow_map_editing',
  showTestBorders:  '@testing_show_borders',
};

interface TestingContextValue {
  showAllMissions: boolean;
  setShowAllMissions: (v: boolean) => void;
  allowMapEditing: boolean;
  setAllowMapEditing: (v: boolean) => void;
  showTestBorders: boolean;
  setShowTestBorders: (v: boolean) => void;
}

const TestingContext = createContext<TestingContextValue | null>(null);

function usePersistentBool(key: string): [boolean, (v: boolean) => void] {
  const [value, _set] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(key).then(raw => { if (raw !== null) _set(JSON.parse(raw)); });
  }, [key]);
  const set = useCallback((v: boolean) => {
    _set(v);
    AsyncStorage.setItem(key, JSON.stringify(v));
  }, [key]);
  return [value, set];
}

export function TestingProvider({ children }: { children: React.ReactNode }) {
  const [showAllMissions,  setShowAllMissions]  = usePersistentBool(KEYS.showAllMissions);
  const [allowMapEditing,  setAllowMapEditing]  = usePersistentBool(KEYS.allowMapEditing);
  const [showTestBorders,  setShowTestBorders]  = usePersistentBool(KEYS.showTestBorders);

  return (
    <TestingContext.Provider value={{
      showAllMissions, setShowAllMissions,
      allowMapEditing, setAllowMapEditing,
      showTestBorders, setShowTestBorders,
    }}>
      {children}
    </TestingContext.Provider>
  );
}

export function useTesting(): TestingContextValue {
  const ctx = useContext(TestingContext);
  if (!ctx) throw new Error('useTesting must be used inside TestingProvider');
  return ctx;
}
