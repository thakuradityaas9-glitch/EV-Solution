import { createContext, useContext } from 'react'

export const DriverVehicleContext = createContext(null)

export function useDriverVehicles() {
  const context = useContext(DriverVehicleContext)
  if (!context) throw new Error('useDriverVehicles must be used inside DriverVehicleProvider.')
  return context
}
