import { useEffect, useState } from 'react'
import type { HospitalWait } from '../logic/hospitalWaitTimes'
import { loadHospitalWaitTimes } from '../services/hospitalWaitTimes'

// Live waits for the ride request form. Failure is silent: the form still books without them.
export function useHospitalWaitTimes(): HospitalWait[] {
  const [waits, setWaits] = useState<HospitalWait[]>([])

  useEffect(() => {
    let live = true
    loadHospitalWaitTimes().then((result) => {
      if (live) setWaits(result)
    })
    return () => {
      live = false
    }
  }, [])

  return waits
}
