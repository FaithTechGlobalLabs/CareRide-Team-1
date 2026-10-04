import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth, RequireRole } from './components/RequireAuth'
import { useApp } from './hooks/useApp'
import { HOME_FOR } from './logic/homeFor'
import { NativeBridge } from './native/NativeBridge'
import { isNative } from './native/platform'
import { Accounts } from './pages/admin/Accounts'
import { Approvals } from './pages/admin/Approvals'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { Landing } from './pages/auth/Landing'
import { Register } from './pages/auth/register/Register'
import { ResetPassword } from './pages/auth/ResetPassword'
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

// The website keeps the marketing page at "/". The app skips it: signed-in people
// go to their role home, everyone else to sign-in. Native RequireAuth also uses
// /signin so unsigned users are not bounced back to "/" and into a redirect loop.
function NativeEntry() {
  const { ready, currentUser } = useApp()
  if (!ready) return null
  return <Navigate to={currentUser ? '/home' : '/signin'} replace />
}

export default function App() {
  return (
    <>
      <NativeBridge />
      <Routes>
        <Route path="/" element={isNative ? <NativeEntry /> : <Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/demo" element={<Demo />} />

        <Route element={<RequireAuth />}>
          <Route path="/home" element={<RoleHome />} />
          <Route element={<Layout />}>
            <Route element={<RequireRole roles={['PLATFORM_ADMIN']} />}>
              <Route path="/admin" element={<Approvals />} />
              <Route path="/admin/accounts" element={<Accounts />} />
            </Route>
            {/* Transport providers: hidden from sign-up for now, but existing ones still work */}
            <Route element={<RequireRole roles={['ORG_ADMIN']} />}>
              <Route path="/org" element={<OrgHome />} />
              <Route path="/org/drivers" element={<Drivers />} />
              <Route path="/org/bookings" element={<Bookings />} />
            </Route>
            <Route element={<RequireRole roles={['PARTNER']} />}>
              <Route path="/partner" element={<Dashboard />} />
              <Route path="/partner/request" element={<RequestRide />} />
              <Route path="/partner/ride/:id" element={<RideDetail />} />
              <Route path="/partner/destinations" element={<Destinations />} />
              <Route path="/partner/drivers" element={<Drivers />} />
              <Route path="/partner/bookings" element={<Bookings />} />
            </Route>
            <Route element={<RequireRole roles={['DRIVER']} />}>
              <Route path="/driver" element={<DriverHome />} />
              <Route path="/driver/my-rides" element={<Navigate to="/driver" replace />} />
              <Route path="/driver/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
