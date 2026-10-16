import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { DriverVehicleContext } from './driverVehicleStore.js'
import {
  createDriverVehicle,
  deleteDriverVehicle,
  fetchDriverVehicles,
  setDefaultDriverVehicle,
  updateDriverVehicle,
} from '../services/driverVehicles.js'

function storageKey(userId) {
  return `ev-solution:active-driver-vehicle:${userId}`
}

function readActiveVehicleId(userId) {
  try {
    return window.localStorage.getItem(storageKey(userId))
  } catch {
    return null
  }
}

function storeActiveVehicleId(userId, vehicleId) {
  try {
    if (vehicleId) window.localStorage.setItem(storageKey(userId), vehicleId)
    else window.localStorage.removeItem(storageKey(userId))
  } catch {
    // The selection still works for this session when storage is unavailable.
  }
}

function chooseActiveVehicleId(vehicles, userId, preferredId) {
  if (preferredId && vehicles.some((vehicle) => vehicle.id === preferredId)) return preferredId

  const savedId = readActiveVehicleId(userId)
  if (savedId && vehicles.some((vehicle) => vehicle.id === savedId)) return savedId

  return vehicles.find((vehicle) => vehicle.is_default)?.id ?? vehicles[0]?.id ?? null
}

export function DriverVehicleProvider({ children }) {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [activeVehicleId, setActiveVehicleId] = useState(null)
  const [loadedUserId, setLoadedUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const currentUserIdRef = useRef(user?.id)
  const requestVersionRef = useRef(0)
  currentUserIdRef.current = user?.id

  useEffect(() => {
    let mounted = true
    const requestVersion = ++requestVersionRef.current
    const userId = user?.id
    setVehicles([])
    setActiveVehicleId(null)
    setLoadedUserId(null)
    setError(null)

    if (!userId) {
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    setLoading(true)
    fetchDriverVehicles(userId)
      .then((nextVehicles) => {
        if (!mounted || requestVersion !== requestVersionRef.current) return
        const nextActiveId = chooseActiveVehicleId(nextVehicles, userId)
        setVehicles(nextVehicles)
        setActiveVehicleId(nextActiveId)
        setLoadedUserId(userId)
        storeActiveVehicleId(userId, nextActiveId)
      })
      .catch((loadError) => {
        if (mounted && requestVersion === requestVersionRef.current) {
          setLoadedUserId(userId)
          setError(loadError.message || 'Could not load your vehicles.')
        }
      })
      .finally(() => {
        if (mounted && requestVersion === requestVersionRef.current) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [user?.id])

  async function refreshVehicles(preferredId = null) {
    if (!user?.id) throw new Error('Your session has expired. Sign in again to manage vehicles.')
    const userId = user.id
    const requestVersion = ++requestVersionRef.current
    setLoading(true)
    setError(null)
    try {
      const nextVehicles = await fetchDriverVehicles(userId)
      if (currentUserIdRef.current !== userId) {
        throw new Error('Your session changed. Refresh the page to continue.')
      }
      const nextActiveId = chooseActiveVehicleId(nextVehicles, userId, preferredId)
      setVehicles(nextVehicles)
      setActiveVehicleId(nextActiveId)
      setLoadedUserId(userId)
      storeActiveVehicleId(userId, nextActiveId)
      return nextVehicles
    } catch (loadError) {
      if (currentUserIdRef.current === userId) setError(loadError.message || 'Could not load your vehicles.')
      throw loadError
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false)
    }
  }

  function selectActiveVehicle(vehicleId) {
    if (!user?.id || !visibleVehicles.some((vehicle) => vehicle.id === vehicleId)) return
    setActiveVehicleId(vehicleId)
    storeActiveVehicleId(user.id, vehicleId)
  }

  async function addVehicle(vehicle) {
    if (!user?.id) throw new Error('Your session has expired. Sign in again to manage vehicles.')
    const created = await createDriverVehicle(user.id, vehicle)
    await refreshVehicles(created.id)
    return created
  }

  async function editVehicle(vehicleId, changes) {
    if (!user?.id) throw new Error('Your session has expired. Sign in again to manage vehicles.')
    const updated = await updateDriverVehicle(user.id, vehicleId, changes)
    await refreshVehicles()
    return updated
  }

  async function removeVehicle(vehicleId) {
    if (!user?.id) throw new Error('Your session has expired. Sign in again to manage vehicles.')
    await deleteDriverVehicle(user.id, vehicleId)
    await refreshVehicles()
  }

  async function makeDefaultVehicle(vehicleId) {
    if (!user?.id) throw new Error('Your session has expired. Sign in again to manage vehicles.')
    const previousDefaultId = vehicles.find((vehicle) => vehicle.is_default)?.id
    await setDefaultDriverVehicle(user.id, vehicleId, previousDefaultId)
    await refreshVehicles()
  }

  const visibleVehicles = loadedUserId === user?.id ? vehicles : []
  const activeVehicle = visibleVehicles.find((vehicle) => vehicle.id === activeVehicleId) ?? null

  return (
    <DriverVehicleContext.Provider
      value={{
        vehicles: visibleVehicles,
        activeVehicle,
        activeVehicleId,
        loading,
        error,
        refreshVehicles,
        selectActiveVehicle,
        addVehicle,
        editVehicle,
        removeVehicle,
        makeDefaultVehicle,
      }}
    >
      {children}
    </DriverVehicleContext.Provider>
  )
}
