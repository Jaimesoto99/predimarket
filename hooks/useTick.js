import { useEffect, useState } from 'react'

// Returns a counter that increments every `intervalMs` milliseconds.
// Components that import this will re-render on each tick, forcing
// time-dependent values (getTimeLeft) to recalculate.
export default function useTick(intervalMs = 60000) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return tick
}
