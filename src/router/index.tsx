import { createBrowserRouter, Navigate } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'
import Login from '@/pages/login'
import Dashboard from '@/pages/dashboard'
import NodeConfigPage from '@/pages/nodeConfig'
import OrdersPage from '@/pages/orders'
import OrderDetailPage from '@/pages/orders/detail'
import SnapshotsPage from '@/pages/settlement/snapshots'
import ReferralPage from '@/pages/referral'
import WithdrawPage from '@/pages/withdraw'
import NftPage from '@/pages/nft'
import ReportsPage from '@/pages/reports'
import BannersPage from '@/pages/content/banners'
import PlatformWalletPage from '@/pages/platformWallet'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'rbac/*', element: <Navigate to="/dashboard" replace /> },
      { path: 'node-config', element: <NodeConfigPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'settlement/snapshots', element: <SnapshotsPage /> },
      { path: 'contract-core', element: <Navigate to="/dashboard" replace /> },
      { path: 'referral', element: <ReferralPage /> },
      { path: 'withdraw', element: <WithdrawPage /> },
      { path: 'nft', element: <NftPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'content/banners', element: <BannersPage /> },
      { path: 'platform-wallet', element: <PlatformWalletPage /> },
      { path: 'audit', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

export default router
