import { useEffect, useState } from 'react';
import { bootRuntimeCore, getRuntimeState, subscribeRuntime } from './core.js';

export function useRuntimeCore() {
  const [runtime, setRuntime] = useState(getRuntimeState);
  useEffect(() => {
    const unsubscribe = subscribeRuntime(setRuntime);
    bootRuntimeCore().catch(() => {});
    return unsubscribe;
  }, []);
  return runtime;
}
