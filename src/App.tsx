import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import IndexPage from './pages/IndexPage'
import PublishPage from './pages/PublishPage'
import MyAccountPage from './pages/MyAccountPage'
import ComingSoonPage from './pages/ComingSoonPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<IndexPage />} />
        <Route path="publish" element={<PublishPage />} />
        <Route path="account" element={<MyAccountPage />} />
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  )
}

export default App
