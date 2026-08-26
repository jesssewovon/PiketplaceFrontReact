import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { useAppDispatch } from './store/hooks'
import { initAuthFetch } from './lib/authFetch'
import Layout from './components/Layout'
import IndexPage from './pages/IndexPage'
import ProductPage from './pages/ProductPage'
import CartBuyNowPage from './pages/CartBuyNowPage'
import ProfilPage from './pages/ProfilPage'
import ReferralsPage from './pages/ReferralsPage'
import NotificationsPage from './pages/NotificationsPage'
import ShippingManagementPage from './pages/ShippingManagementPage'
import AddShippingImagesPage from './pages/AddShippingImagesPage'
import PayDeliveryPenaltiesPage from './pages/PayDeliveryPenaltiesPage'
import MaintenancePage from './pages/MaintenancePage'
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
import PartnerAccountPage from './pages/Representative/PartnerAccountPage'
import PartnerOrdersPage from './pages/Representative/PartnerOrdersPage'
import PartnersPaymentPage from './pages/Representative/PartnersPaymentPage'
import PartnerWalletAddressPage from './pages/Representative/PartnerWalletAddressPage'
import DonationPage from './pages/DonationPage'
import MyAddressesPage from './pages/MyAddressesPage'
import ComingSoonPage from './pages/ComingSoonPage'
import AdministrationPage from './pages/Admin/AdministrationPage'
import AdminProductsPage from './pages/Admin/AdminProductsPage'
import AdminOrdersPage from './pages/Admin/AdminOrdersPage'
import AdminWithdrawalsPage from './pages/Admin/AdminWithdrawalsPage'
import WalletBalanceDetailsPage from './pages/Admin/WalletBalanceDetailsPage'

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
        <Route path="cart-buy-now/:id/:inFreeShippingZone?" element={<CartBuyNowPage />} />
        <Route path="profil" element={<ProfilPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="shipping-management/line-order/:id" element={<ShippingManagementPage />} />
        <Route path="add-update-shipping-images/:type" element={<AddShippingImagesPage />} />
        <Route path="pay-delivery-penalities" element={<PayDeliveryPenaltiesPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
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
        <Route path="partners-payment" element={<PartnersPaymentPage />} />
        <Route path="partner-wallet-address" element={<PartnerWalletAddressPage />} />
        <Route path="donation" element={<DonationPage />} />
        <Route path="my-addresses" element={<MyAddressesPage />} />
        <Route path="mining" element={<MiningPage />} />
        <Route path="administration" element={<AdministrationPage />} />
        <Route path="admin-products" element={<AdminProductsPage />} />
        <Route path="admin-orders" element={<AdminOrdersPage />} />
        <Route path="admin-withdrawals" element={<AdminWithdrawalsPage />} />
        <Route path="wallet-balance-details/:username" element={<WalletBalanceDetailsPage />} />
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  )
}

export default App
