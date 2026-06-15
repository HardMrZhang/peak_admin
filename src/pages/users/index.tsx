import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Table, Button, Form, Input, Select, Tag, Space, Typography, DatePicker, Tooltip,
  Modal, Descriptions, Popconfirm, App, Spin, Tree, Statistic, Row, Col,
} from 'antd'
import {
  EyeOutlined, SearchOutlined, StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import {
  getUsers, getUserDetail, getUserReferrals, updateUserStatus,
} from '@/api/users'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const shortText = (value?: string | null, head = 6, tail = 4) => {
  if (!value) return '-'
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

function nodeTitle(wallet: string, directCount: number, suffix?: string) {
  return (
    <span>
      <Text copyable={{ text: wallet }} style={{ fontFamily: 'Consolas, monospace' }}>
        {shortText(wallet, 8, 6)}
      </Text>
      {suffix ? <Text type="secondary">{suffix}</Text> : null}
      <Text type="secondary" style={{ marginLeft: 8 }}>(直推 {directCount})</Text>
    </span>
  )
}

function updateTreeData(list: DataNode[], key: React.Key, children: DataNode[]): DataNode[] {
  return list.map((node) => {
    if (node.key === key) {
      return { ...node, children }
    }
    if (node.children) {
      return { ...node, children: updateTreeData(node.children, key, children) }
    }
    return node
  })
}

export default function UsersPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [form] = Form.useForm()

  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [treeData, setTreeData] = useState<DataNode[]>([])

  const loadData = async (page = 1, pageSize = 10, extra?: Record<string, any>) => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...filters, ...extra }
      const res: any = await getUsers(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const f: Record<string, any> = {}
    if (values.walletAddress) f.walletAddress = values.walletAddress.trim()
    if (values.inviteCode) f.inviteCode = values.inviteCode.trim()
    if (values.email) f.email = values.email.trim()
    if (values.status !== undefined && values.status !== '') f.status = values.status
    if (values.dateRange) {
      f.startDate = values.dateRange[0].format('YYYY-MM-DD')
      f.endDate = values.dateRange[1].format('YYYY-MM-DD')
    }
    setFilters(f)
    loadData(1, pagination.pageSize, f)
  }

  const handleToggleStatus = async (record: any) => {
    const newStatus = record.status === 1 ? 0 : 1
    try {
      await updateUserStatus(record.id, newStatus)
      message.success(newStatus === 1 ? '已启用' : '已禁用')
      loadData(pagination.current, pagination.pageSize)
    } catch { /* handled by interceptor */ }
  }

  const openDetail = async (record: any) => {
    setDetailVisible(true)
    setDetailLoading(true)
    setDetail(null)
    setTreeData([])
    try {
      const res: any = await getUserDetail(record.id)
      const d = res.data
      setDetail(d)
      setTreeData([
        {
          key: d.id,
          title: nodeTitle(d.walletAddress, d.stats?.directReferralCount ?? 0, '（当前用户）'),
          isLeaf: (d.stats?.directReferralCount ?? 0) === 0,
        },
      ])
    } finally {
      setDetailLoading(false)
    }
  }

  const onLoadTreeData = async (node: any) => {
    if (node.children && node.children.length) return
    const res: any = await getUserReferrals(node.key)
    const children: DataNode[] = (res.data || []).map((c: any) => ({
      key: c.id,
      title: nodeTitle(c.walletAddress, c.directReferralCount ?? 0, c.status === 1 ? '' : '（禁用）'),
      isLeaf: (c.directReferralCount ?? 0) === 0,
    }))
    setTreeData((origin) => updateTreeData(origin, node.key, children))
  }

  const goOrders = (path: string, wallet: string) => {
    setDetailVisible(false)
    navigate(`${path}?wallet=${encodeURIComponent(wallet)}`)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '钱包地址',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      width: 170,
      render: (v: string) => (
        <Tooltip title={v}>
          <Text style={{ whiteSpace: 'nowrap', fontFamily: 'Consolas, monospace' }}>{shortText(v, 6, 4)}</Text>
        </Tooltip>
      ),
    },
    { title: '我的邀请码', dataIndex: 'inviteCode', key: 'inviteCode', width: 140 },
    {
      title: '邀请人',
      dataIndex: 'referrerWallet',
      key: 'referrerWallet',
      width: 150,
      render: (v: string | null) => (v ? (
        <Tooltip title={v}>
          <Text style={{ whiteSpace: 'nowrap', fontFamily: 'Consolas, monospace' }}>{shortText(v, 6, 4)}</Text>
        </Tooltip>
      ) : '-'),
    },
    { title: '影视APP绑定邮箱', dataIndex: 'email', key: 'email', width: 200, render: (v: string | null) => v || '-' },
    { title: '直推', dataIndex: 'directReferralCount', key: 'directReferralCount', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: number) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '正常' : '禁用'}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>查看</Button>
          <Popconfirm
            title={`确认${record.status === 1 ? '禁用' : '启用'}该用户？`}
            onConfirm={() => handleToggleStatus(record)}
          >
            <Button
              type="link"
              size="small"
              danger={record.status === 1}
              icon={record.status === 1 ? <StopOutlined /> : <CheckCircleOutlined />}
            >
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>用户账户</Title>
        <Text type="secondary">查看和管理平台钱包用户</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="dateRange"><RangePicker /></Form.Item>
          <Form.Item name="walletAddress"><Input placeholder="钱包地址" allowClear style={{ width: 200 }} /></Form.Item>
          <Form.Item name="inviteCode"><Input placeholder="我的邀请码" allowClear /></Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="全部状态"
              allowClear
              style={{ width: 120 }}
              options={[{ label: '正常', value: 1 }, { label: '禁用', value: 0 }]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => { form.resetFields(); setFilters({}); loadData(1, pagination.pageSize, {}) }}>重置</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          className="compact-admin-table"
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          tableLayout="fixed"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => loadData(page, pageSize),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="用户详细信息"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>}
        width={760}
        destroyOnClose
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="用户ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="账户状态">
                <Tag color={detail.status === 1 ? 'success' : 'default'}>{detail.status === 1 ? '正常' : '禁用'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="钱包地址" span={2}>
                <Text copyable style={{ fontFamily: 'Consolas, monospace' }}>{detail.walletAddress}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="我的邀请码">{detail.inviteCode || '-'}</Descriptions.Item>
              <Descriptions.Item label="影视APP绑定邮箱">{detail.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="邀请人钱包" span={2}>
                {detail.referrerWallet
                  ? <Text copyable style={{ fontFamily: 'Consolas, monospace' }}>{detail.referrerWallet}</Text>
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {detail.createdAt ? new Date(detail.createdAt).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ margin: '20px 0 12px', fontWeight: 600 }}>查看订单</div>
            <Space wrap>
              <Button onClick={() => goOrders('/orders', detail.walletAddress)}>
                影视节点（{detail.stats?.nodeOrderCount ?? 0}）
              </Button>
              <Button onClick={() => goOrders('/airdrop-orders', detail.walletAddress)}>
                三倍空投（{detail.stats?.airdropCount ?? 0}）
              </Button>
              <Button onClick={() => goOrders('/stake-orders', detail.walletAddress)}>
                PEAK质押（{detail.stats?.stakeCount ?? 0}）
              </Button>
            </Space>

            <div style={{ margin: '20px 0 12px', fontWeight: 600 }}>推广</div>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <Card size="small"><Statistic title="直推人数" value={detail.stats?.directReferralCount ?? 0} suffix="人" /></Card>
              </Col>
              <Col span={12}>
                <Card size="small"><Statistic title="团队人数" value={detail.stats?.teamCount ?? 0} suffix="人" /></Card>
              </Col>
            </Row>
            {treeData.length > 0 && (
              <Tree
                loadData={onLoadTreeData}
                treeData={treeData}
                showLine
                blockNode
              />
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
