import { createBrowserRouter, Navigate } from 'react-router-dom'
import AdminLayout from '@/layouts/AdminLayout'
import Login from '@/pages/login'
import Dashboard from '@/pages/dashboard'
import NodeConfigPage from '@/pages/nodeConfig'
import OrdersPage from '@/pages/orders'
import OrderDetailPage from '@/pages/orders/detail'
import AirdropOrdersPage from '@/pages/orders/airdrop'
import StakeOrdersPage from '@/pages/orders/stake'
import GenesisPage from '@/pages/genesis'
import UsersPage from '@/pages/users'
import AdminUsersPage from '@/pages/rbac/users'
import SnapshotsPage from '@/pages/settlement/snapshots'
import ReferralPage from '@/pages/referral'
import WithdrawPage from '@/pages/withdraw'
import NftPage from '@/pages/nft'
import ReportsPage from '@/pages/reports'
import BannersPage from '@/pages/content/banners'
import PlatformWalletPage from '@/pages/platformWallet'
import ContractCorePage from '@/pages/contractCore'

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
      { path: 'users', element: <UsersPage /> },
      { path: 'rbac/users', element: <AdminUsersPage /> },
      { path: 'rbac/*', element: <Navigate to="/dashboard" replace /> },
      { path: 'node-config', element: <NodeConfigPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'airdrop-orders', element: <AirdropOrdersPage /> },
      { path: 'stake-orders', element: <StakeOrdersPage /> },
      { path: 'genesis', element: <GenesisPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'settlement/snapshots', element: <SnapshotsPage /> },
      { path: 'contract-core', element: <ContractCorePage /> },
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
