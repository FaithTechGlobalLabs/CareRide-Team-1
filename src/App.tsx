import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { useApp } from './hooks/useApp'
import { HOME_FOR } from './logic/homeFor'
import { Accounts } from './pages/admin/Accounts'
import { Approvals } from './pages/admin/Approvals'
import { Landing } from './pages/auth/Landing'
import { Register } from './pages/auth/register/Register'
import { SignIn } from './pages/auth/SignIn'
import { Demo } from './pages/demo/Demo'
import { DriverHome } from './pages/driver/DriverHome'
import { Settings } from './pages/driver/Settings'
import { Bookings } from './pages/org/Bookings'
import { Destinations } from './pages/org/Destinations'
import { Drivers } from './pages/org/Drivers'
import { OrgHome } from './pages/org/OrgHome'
import { Dashboard } from './pages/partner/Dashboard'
import { RequestRide } from './pages/partner/RequestRide'
import { RideDetail } from './pages/partner/RideDetail'

// "/home" always lands on the right main page for whoever is signed in.
function RoleHome() {
  const { currentUser } = useApp()
  return <Navigate to={currentUser ? HOME_FOR[currentUser.role] : '/signin'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route path="/demo" element={<Demo />} />

      <Route element={<RequireAuth />}>
        <Route path="/home" element={<RoleHome />} />
        <Route element={<Layout />}>
          <Route path="/admin" element={<Approvals />} />
          <Route path="/admin/accounts" element={<Accounts />} />
          {/* Transport providers: hidden from sign-up for now, but existing ones still work */}
          <Route path="/org" element={<OrgHome />} />
          <Route path="/org/drivers" element={<Drivers />} />
          <Route path="/org/bookings" element={<Bookings />} />
          <Route path="/partner" element={<Dashboard />} />
          <Route path="/partner/request" element={<RequestRide />} />
          <Route path="/partner/ride/:id" element={<RideDetail />} />
          <Route path="/partner/destinations" element={<Destinations />} />
          <Route path="/partner/drivers" element={<Drivers />} />
          <Route path="/partner/bookings" element={<Bookings />} />
          <Route path="/driver" element={<DriverHome />} />
          <Route path="/driver/my-rides" element={<Navigate to="/driver" replace />} />
          <Route path="/driver/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
