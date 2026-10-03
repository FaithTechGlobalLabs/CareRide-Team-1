import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Approvals } from './pages/admin/Approvals'
import { MyRides } from './pages/driver/MyRides'
import { Requests } from './pages/driver/Requests'
import { Home } from './pages/Home'
import { Destinations } from './pages/org/Destinations'
import { Facilities } from './pages/org/Facilities'
import { DriverSignUp } from './pages/signup/DriverSignUp'
import { OrgSignUp } from './pages/signup/OrgSignUp'
import { Dashboard } from './pages/staff/Dashboard'
import { RequestRide } from './pages/staff/RequestRide'
import { RideDetail } from './pages/staff/RideDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/signup/org" element={<OrgSignUp />} />
        <Route path="/signup/driver" element={<DriverSignUp />} />
        <Route path="/admin" element={<Approvals />} />
        <Route path="/org/facilities" element={<Facilities />} />
        <Route path="/org/destinations" element={<Destinations />} />
        <Route path="/staff" element={<Dashboard />} />
        <Route path="/staff/request" element={<RequestRide />} />
        <Route path="/staff/ride/:id" element={<RideDetail />} />
        <Route path="/driver" element={<Requests />} />
        <Route path="/driver/my-rides" element={<MyRides />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
