import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import IndexPage from './pages/IndexPage'
import PublishPage from './pages/PublishPage'
import MyAccountPage from './pages/MyAccountPage'
import MiningPage from './pages/MiningPage'
import ComingSoonPage from './pages/ComingSoonPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<IndexPage />} />
        <Route path="publish" element={<PublishPage />} />
        <Route path="account" element={<MyAccountPage />} />
        <Route path="mining" element={<MiningPage />} />
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  )
}

export default App
