import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useAppDispatch } from './store/hooks'
import { initAuthFetch } from './lib/authFetch'
import Layout from './components/Layout'
import IndexPage from './pages/IndexPage'
import ProductPage from './pages/ProductPage'
import PublishPage from './pages/PublishPage'
import MyAccountPage from './pages/MyAccountPage'
import MiningPage from './pages/MiningPage'
import MyStorePage from './pages/MyStorePage'
import MySalesPage from './pages/MySalesPage'
import MyOrdersPage from './pages/MyOrdersPage'
import MessageContactsPage from './pages/MessageContactsPage'
import TermsPage from './pages/TermsPage'
import FaqPage from './pages/FaqPage'
import PartnershipsPage from './pages/PartnershipsPage'
import UnlockBoostPage from './pages/UnlockBoostPage'
import PiAdBoostHistoriesPage from './pages/PiAdBoostHistoriesPage'
import PartnerAccountPage from './pages/PartnerAccountPage'
import PartnerOrdersPage from './pages/PartnerOrdersPage'
import DonationPage from './pages/DonationPage'
import MyAddressesPage from './pages/MyAddressesPage'
import ComingSoonPage from './pages/ComingSoonPage'

function App() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    initAuthFetch(dispatch, navigate)
  }, [dispatch, navigate])

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<IndexPage />} />
        <Route path="product/:id" element={<ProductPage />} />
        <Route path="publish" element={<PublishPage />} />
        <Route path="account" element={<MyAccountPage />} />
        <Route path="my-store" element={<MyStorePage />} />
        <Route path="my-sales" element={<MySalesPage />} />
        <Route path="my-orders" element={<MyOrdersPage />} />
        <Route path="message-contacts" element={<MessageContactsPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="partnerships" element={<PartnershipsPage />} />
        <Route path="unlock-boost" element={<UnlockBoostPage />} />
        <Route path="pi-ad-boost-histories" element={<PiAdBoostHistoriesPage />} />
        <Route path="partner-account" element={<PartnerAccountPage />} />
        <Route path="partner-orders" element={<PartnerOrdersPage />} />
        <Route path="donation" element={<DonationPage />} />
        <Route path="my-addresses" element={<MyAddressesPage />} />
        <Route path="mining" element={<MiningPage />} />
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  )
}

export default App
