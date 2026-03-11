import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Form, Select, Tag, Space, Typography, Statistic, Row, Col, Tooltip,
} from 'antd'
import {
  SearchOutlined, WalletOutlined, ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { getPlatformBalances, getPlatformLedger } from '@/api/platformWallet'

const { Title, Text } = Typography

interface PlatformBalance {
  walletAddress: string
  asset: string
  availableAmount: string
  totalInAmount: string
  totalOutAmount: string
  updatedAt: string
}

interface LedgerEntry {
  id: string
  entryNo: string
  walletAddress: string
  asset: string
  changeType: string
  direction: string
  amount: string
  balanceBefore: string
  balanceAfter: string
  bizType: string | null
  bizId: string | null
  relatedUserId: string | null
  txHash: string | null
  remark: string | null
  createdAt: string
}

const changeTypeMap: Record<string, { color: string; text: string }> = {
  DEPOSIT_IN: { color: 'green', text: '充值入账' },
  WITHDRAW_OUT: { color: 'red', text: '提现出账' },
}

const directionMap: Record<string, { color: string; text: string }> = {
  IN: { color: '#52c41a', text: '+ 收入' },
  OUT: { color: '#ff4d4f', text: '- 支出' },
}

export default function PlatformWalletPage() {
  const [balances, setBalances] = useState<PlatformBalance[]>([])
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()

  const loadBalances = async () => {
    setBalanceLoading(true)
    try {
      const res: any = await getPlatformBalances()
      setBalances(res.data || [])
    } finally {
      setBalanceLoading(false)
    }
  }

  const loadLedger = async (page = 1, pageSize = 10) => {
    setLedgerLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: Record<string, any> = { page, pageSize }
      if (values.asset) params.asset = values.asset
      if (values.changeType) params.changeType = values.changeType
      const res: any = await getPlatformLedger(params)
      setLedgerData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLedgerLoading(false)
    }
  }

  useEffect(() => {
    loadBalances()
    loadLedger()
  }, [])

  const shortText = (value?: string | null, head = 8, tail = 6) => {
    if (!value) return '-'
    if (value.length <= head + tail + 3) return value
    return `${value.slice(0, head)}...${value.slice(-tail)}`
  }

  const usdtBalance = balances.find((b) => b.asset === 'USDT')

  const columns = [
    {
      title: '流水号',
      dataIndex: 'entryNo',
      key: 'entryNo',
      width: 210,
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <Text copyable={{ text: v }} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{shortText(v, 12, 8)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'changeType',
      key: 'changeType',
      width: 120,
      render: (v: string) => {
        const ct = changeTypeMap[v] || { color: 'default', text: v }
        return <Tag color={ct.color}>{ct.text}</Tag>
      },
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 90,
      render: (v: string) => {
        const d = directionMap[v] || { color: '#999', text: v }
        return <Text style={{ color: d.color, fontWeight: 600 }}>{d.text}</Text>
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (v: string, r: LedgerEntry) => (
        <Text strong style={{ color: r.direction === 'IN' ? '#52c41a' : '#ff4d4f', whiteSpace: 'nowrap' }}>
          {r.direction === 'IN' ? '+' : '-'}{v}
        </Text>
      ),
    },
    { title: '资产', dataIndex: 'asset', key: 'asset', width: 80 },
    {
      title: '变动前余额',
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      width: 140,
    },
    {
      title: '变动后余额',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      width: 140,
    },
    {
      title: '关联用户',
      dataIndex: 'relatedUserId',
      key: 'relatedUserId',
      width: 120,
      render: (v: string | null) => v || '-',
    },
    {
      title: '交易哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      width: 180,
      ellipsis: true,
      render: (v: string | null) => v
        ? (
          <Tooltip title={v}>
            <Text copyable={{ text: v }} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{shortText(v, 12, 8)}</Text>
          </Tooltip>
        )
        : '-',
    },
    {
      title: '业务类型',
      dataIndex: 'bizType',
      key: 'bizType',
      width: 100,
      render: (v: string | null) => v || '-',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>归集钱包管理</Title>
        <Text type="secondary">查看平台归集钱包余额与资金流水</Text>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }} loading={balanceLoading}>
            <Statistic
              title="USDT 可用余额"
              value={usdtBalance ? Number(usdtBalance.availableAmount).toFixed(2) : '0.00'}
              prefix={<WalletOutlined style={{ color: '#6366f1' }} />}
              valueStyle={{ color: '#6366f1', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }} loading={balanceLoading}>
            <Statistic
              title="累计收入"
              value={usdtBalance ? Number(usdtBalance.totalInAmount).toFixed(2) : '0.00'}
              prefix={<ArrowDownOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
              suffix="USDT"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }} loading={balanceLoading}>
            <Statistic
              title="累计支出"
              value={usdtBalance ? Number(usdtBalance.totalOutAmount).toFixed(2) : '0.00'}
              prefix={<ArrowUpOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f', fontSize: 28 }}
              suffix="USDT"
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={() => loadLedger()}>
          <Form.Item name="asset">
            <Select placeholder="资产类型" allowClear style={{ width: 120 }}
              options={[{ label: 'USDT', value: 'USDT' }, { label: 'PEAK', value: 'PEAK' }]}
            />
          </Form.Item>
          <Form.Item name="changeType">
            <Select placeholder="变动类型" allowClear style={{ width: 140 }}
              options={[
                { label: '充值入账', value: 'DEPOSIT_IN' },
                { label: '提现出账', value: 'WITHDRAW_OUT' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => { form.resetFields(); loadLedger() }}>重置</Button>
          </Form.Item>
          <Form.Item>
            <Button icon={<ReloadOutlined />} onClick={() => { loadBalances(); loadLedger() }}>刷新</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }} title="资金流水">
        <Table
          className="compact-admin-table"
          columns={columns}
          dataSource={ledgerData}
          rowKey="id"
          loading={ledgerLoading}
          tableLayout="fixed"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => loadLedger(page, pageSize),
          }}
          scroll={{ x: 1600 }}
        />
      </Card>
    </div>
  )
}
