import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Typography, Table, Tag, Space, Spin } from 'antd'
import {
  ShoppingCartOutlined,
  WalletOutlined,
  BlockOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { getOrders } from '@/api/orders'
import { getWithdraws } from '@/api/withdraw'
import { getDashboardOverview } from '@/api/reports'

const { Title, Text } = Typography

const statCards = [
  { title: '总订单数', icon: <ShoppingCartOutlined />, color: '#6366f1', bg: '#eef2ff', key: 'orders' },
  { title: '待处理提现', icon: <WalletOutlined />, color: '#f59e0b', bg: '#fffbeb', key: 'pendingWithdraws' },
  { title: '今日销售额', icon: <DollarOutlined />, color: '#10b981', bg: '#ecfdf5', key: 'todaySales' },
  { title: 'NFT 铸造量', icon: <BlockOutlined />, color: '#ec4899', bg: '#fdf2f8', key: 'nftMinted' },
]

const orderStatusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待支付' },
  PAID: { color: 'processing', text: '已支付' },
  FAILED: { color: 'error', text: '失败' },
  CANCELLED: { color: 'warning', text: '已取消' },
  EXPIRED: { color: 'volcano', text: '已过期' },
}

const withdrawStatusMap: Record<string, { color: string; text: string }> = {
  PENDING_REVIEW: { color: 'processing', text: '待审核' },
  PENDING_SEND: { color: 'success', text: '已通过' },
  REJECTED: { color: 'error', text: '已拒绝' },
  SENT: { color: 'cyan', text: '已发送' },
  SUCCESS: { color: 'green', text: '已完成' },
  FAILED: { color: 'error', text: '失败' },
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, number>>({
    orders: 0,
    pendingWithdraws: 0,
    todaySales: 0,
    nftMinted: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [recentWithdraws, setRecentWithdraws] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersRes, withdrawRes, overviewRes]: any[] = await Promise.allSettled([
        getOrders({ page: 1, pageSize: 5 }),
        getWithdraws({ page: 1, pageSize: 5 }),
        getDashboardOverview(),
      ])

      if (ordersRes.status === 'fulfilled') {
        const d = ordersRes.value?.data
        setRecentOrders(d?.list || [])
        setStats((s) => ({ ...s, orders: d?.total || 0 }))
      }
      if (withdrawRes.status === 'fulfilled') {
        const d = withdrawRes.value?.data
        setRecentWithdraws(d?.list || [])
      }
      if (overviewRes.status === 'fulfilled') {
        const d = overviewRes.value?.data || {}
        setStats((s) => ({
          ...s,
          orders: Number(d.totalOrders || 0),
          pendingWithdraws: Number(d.pendingWithdraws || 0),
          todaySales: Number(d.todaySales || 0),
          nftMinted: Number(d.nftMinted || 0),
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 220,
      ellipsis: true,
      render: (v: string) => <Text style={{ whiteSpace: 'nowrap' }}>{v || '-'}</Text>,
    },
    {
      title: '用户',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      width: 160,
      render: (v: string) => v ? `${v.slice(0, 6)}...${v.slice(-4)}` : '-',
    },
    {
      title: '金额',
      dataIndex: 'totalAmountUsdt',
      key: 'totalAmountUsdt',
      width: 100,
      render: (v: string) => <Text strong style={{ whiteSpace: 'nowrap' }}>${v}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const s = orderStatusMap[v] || { color: 'default', text: v }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
  ]

  const withdrawColumns = [
    {
      title: '用户',
      dataIndex: 'userWallet',
      key: 'userWallet',
      width: 160,
      render: (v: string) => v ? `${v.slice(0, 6)}...${v.slice(-4)}` : '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      render: (v: string) => <Text strong style={{ whiteSpace: 'nowrap' }}>{v}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const s = withdrawStatusMap[v] || { color: 'default', text: v }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>控制台</Title>
        <Text type="secondary">欢迎回来，这是系统运营概览</Text>
      </div>

      <Row gutter={[16, 16]}>
        {statCards.map((item, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              bodyStyle={{ padding: '20px 24px' }}
            >
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>{item.title}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Statistic
                      value={stats[item.key]}
                      valueStyle={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: item.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><ShoppingCartOutlined style={{ color: '#6366f1' }} /><span>最近订单</span></Space>}
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <Table
              className="compact-admin-table"
              columns={orderColumns}
              dataSource={recentOrders}
              rowKey="id"
              pagination={false}
              size="small"
              tableLayout="fixed"
              scroll={{ x: 640 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><WalletOutlined style={{ color: '#f59e0b' }} /><span>最近提现</span></Space>}
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <Table
              className="compact-admin-table"
              columns={withdrawColumns}
              dataSource={recentWithdraws}
              rowKey="id"
              pagination={false}
              size="small"
              tableLayout="fixed"
              scroll={{ x: 620 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
