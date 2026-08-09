import { Navigate } from 'react-router-dom'

/**
 * DriverHome now owns the full search -> results -> map flow (it used
 * to be split across two pages with two different, disagreeing
 * Emergency Mode implementations — one of the bugs this consolidation
 * fixes). Keeping this route registered as a redirect rather than
 * deleting it outright, in case anything still links here.
 */
export default function Recommendations() {
  return <Navigate to="/driver" replace />
}
