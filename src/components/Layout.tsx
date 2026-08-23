import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import { useAppSelector } from '../store/hooks'

export default function Layout() {
  const location = useLocation()
  const productsLoaded = useAppSelector((state) => state.ui.productsLoaded)
  const isHome = location.pathname === '/'
  const showBottomNav = !isHome || productsLoaded

  return (
    <div className="app-shell">
      <Header />
      <main className={showBottomNav ? 'flex-1 pb-24' : 'flex-1'}>
        <Outlet />
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  )
}
