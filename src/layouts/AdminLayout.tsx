import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge,
  Breadcrumb,
  Spin,
} from 'antd'
import {
  DashboardOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  CalculatorOutlined,
  ShareAltOutlined,
  WalletOutlined,
  BlockOutlined,
  BarChartOutlined,
  PictureOutlined,
  LogoutOutlined,
  UserOutlined,
  LockOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  BankOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAuthStore } from '@/store/auth'
import ChangePasswordModal from '@/components/ChangePasswordModal'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const menuItems: MenuProps['items'] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '控制台',
  },
  {
    key: '/node-config',
    icon: <SettingOutlined />,
    label: '节点配置',
  },
  {
    key: '/orders',
    icon: <ShoppingCartOutlined />,
    label: '订单管理',
  },
  {
    key: 'settlement',
    icon: <CalculatorOutlined />,
    label: '结算管理',
    children: [
      { key: '/settlement/snapshots', label: '奖励快照' },
    ],
  },
  {
    key: '/referral',
    icon: <ShareAltOutlined />,
    label: '推荐管理',
  },
  {
    key: '/withdraw',
    icon: <WalletOutlined />,
    label: '提现管理',
  },
  {
    key: '/platform-wallet',
    icon: <BankOutlined />,
    label: '归集钱包',
  },
  {
    key: '/nft',
    icon: <BlockOutlined />,
    label: 'NFT 管理',
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: '数据报表',
  },
  {
    key: '/content/banners',
    icon: <PictureOutlined />,
    label: '内容管理',
  },
]

const breadcrumbMap: Record<string, string> = {
  dashboard: '控制台',
  'node-config': '节点配置',
  orders: '订单管理',
  settlement: '结算管理',
  snapshots: '奖励快照',
  referral: '推荐管理',
  withdraw: '提现管理',
  'platform-wallet': '归集钱包',
  nft: 'NFT 管理',
  reports: '数据报表',
  content: '内容管理',
  banners: 'Banner 管理',
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, user, fetchProfile, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pwdVisible, setPwdVisible] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    fetchProfile().finally(() => setLoading(false))
  }, [token])

  const selectedKeys = [location.pathname]
  const openKeys = location.pathname.split('/').length > 2
    ? [`/${location.pathname.split('/')[1]}`, location.pathname.split('/').slice(0, 2).join('/')]
    : []

  const pathParts = location.pathname.split('/').filter(Boolean)
  const breadcrumbItems = [
    { title: '首页' },
    ...pathParts.map((part) => ({ title: breadcrumbMap[part] || part })),
  ]

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      key: 'changePwd',
      icon: <LockOutlined />,
      label: '修改密码',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <BlockOutlined style={{ fontSize: 28, color: '#6366f1' }} />
          {!collapsed && (
            <Text
              strong
              style={{
                color: '#fff',
                fontSize: 20,
                marginLeft: 12,
                letterSpacing: 1,
              }}
            >
              Peak Admin
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <Space>
            <span
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 18, cursor: 'pointer', color: '#64748b' }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Breadcrumb items={breadcrumbItems} style={{ marginLeft: 16 }} />
          </Space>

          <Space size={20}>
            <Badge count={0} size="small">
              <BellOutlined style={{ fontSize: 18, color: '#64748b', cursor: 'pointer' }} />
            </Badge>
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: ({ key }) => {
                  if (key === 'logout') logout()
                  if (key === 'changePwd') setPwdVisible(true)
                },
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#6366f1' }} icon={<UserOutlined />} />
                <Text strong>{user?.displayName || user?.username}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: 0, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>

      <ChangePasswordModal visible={pwdVisible} onClose={() => setPwdVisible(false)} />
    </Layout>
  )
}
