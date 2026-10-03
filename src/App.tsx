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
import { MyRides } from './pages/driver/MyRides'
import { Requests } from './pages/driver/Requests'
import { Settings } from './pages/driver/Settings'
import { Dashboard } from './pages/house/Dashboard'
import { RequestRide } from './pages/house/RequestRide'
import { RideDetail } from './pages/house/RideDetail'
import { Bookings } from './pages/org/Bookings'
import { Destinations } from './pages/org/Destinations'
import { Drivers } from './pages/org/Drivers'
import { Houses } from './pages/org/Houses'
import { OrgHome } from './pages/org/OrgHome'

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

      <Route element={<RequireAuth />}>
        <Route path="/home" element={<RoleHome />} />
        <Route element={<Layout />}>
          <Route path="/admin" element={<Approvals />} />
          <Route path="/admin/accounts" element={<Accounts />} />
          <Route path="/org" element={<OrgHome />} />
          <Route path="/org/houses" element={<Houses />} />
          <Route path="/org/destinations" element={<Destinations />} />
          <Route path="/org/drivers" element={<Drivers />} />
          <Route path="/org/bookings" element={<Bookings />} />
          <Route path="/house" element={<Dashboard />} />
          <Route path="/house/request" element={<RequestRide />} />
          <Route path="/house/ride/:id" element={<RideDetail />} />
          <Route path="/driver" element={<Requests />} />
          <Route path="/driver/my-rides" element={<MyRides />} />
          <Route path="/driver/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
