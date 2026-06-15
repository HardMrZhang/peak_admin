import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card, Table, Button, Form, Input, InputNumber, Select, Tag, Typography, Tooltip, Tabs,
  Modal, Descriptions, Spin, App, Row, Col, Statistic, DatePicker, Space, Popconfirm,
} from 'antd'
import { EyeOutlined, SearchOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  getGenesisOrders, getGenesisOrderDetail, getGenesisNfts,
  getGenesisConfigs, updateGenesisConfig, toggleGenesisStatus, type GenesisStatus,
} from '@/api/genesis'

const { RangePicker } = DatePicker

const { Title, Text } = Typography

const orderStatusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '待支付' },
  COMPLETED: { color: 'success', text: '已完成' },
  FAILED: { color: 'error', text: '失败' },
  CANCELLED: { color: 'default', text: '已取消' },
}

const nftStatusMap: Record<string, { color: string; text: string }> = {
  SUCCESS: { color: 'success', text: '已铸造' },
  PENDING: { color: 'processing', text: '铸造中' },
  FAILED: { color: 'error', text: '失败' },
}

const shortText = (value?: string | null, head = 6, tail = 4) => {
  if (!value) return '-'
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

const walletCell = (v: string) => (
  <Tooltip title={v}>
    <Text style={{ whiteSpace: 'nowrap', fontFamily: 'Consolas, monospace' }}>{shortText(v, 6, 4)}</Text>
  </Tooltip>
)

function GenesisOrdersTab() {
  const [searchParams] = useSearchParams()
  const initialWallet = searchParams.get('wallet') || ''
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>(initialWallet ? { walletAddress: initialWallet } : {})
  const [form] = Form.useForm()

  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<any>(null)

  const loadData = async (page = 1, pageSize = 10, extra?: Record<string, any>) => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...filters, ...extra }
      const res: any = await getGenesisOrders(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialWallet) form.setFieldsValue({ walletAddress: initialWallet })
    loadData()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  const handleSearch = () => {
    const v = form.getFieldsValue()
    const f: Record<string, any> = {}
    if (v.orderNo) f.orderNo = v.orderNo.trim()
    if (v.walletAddress) f.walletAddress = v.walletAddress.trim()
    if (v.status) f.status = v.status
    setFilters(f)
    loadData(1, pagination.pageSize, f)
  }

  const openDetail = async (record: any) => {
    setDetailVisible(true)
    setDetailLoading(true)
    setDetail(null)
    try {
      const res: any = await getGenesisOrderDetail(record.id)
      setDetail(res.data)
    } finally {
      setDetailLoading(false)
    }
  }

  const columns = [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 190, ellipsis: true },
    { title: '钱包地址', dataIndex: 'walletAddress', key: 'walletAddress', width: 150, ellipsis: true, render: walletCell },
    { title: '邀请码', dataIndex: 'inviteCode', key: 'inviteCode', width: 110, ellipsis: true, render: (v: string) => v || '-' },
    { title: '数量', dataIndex: 'qty', key: 'qty', width: 70 },
    { title: '单价(USDT)', dataIndex: 'unitPriceUsdt', key: 'unitPriceUsdt', width: 110 },
    { title: '总额(USDT)', dataIndex: 'totalAmountUsdt', key: 'totalAmountUsdt', width: 120 },
    { title: '空投(PEAK)', dataIndex: 'peakAirdropTotal', key: 'peakAirdropTotal', width: 120 },
    { title: 'NFT数', dataIndex: 'nftCount', key: 'nftCount', width: 80 },
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
      width: 90,
      fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
      ),
    },
  ]

  const nftColumns = [
    { title: '铸造编号', dataIndex: 'mintNo', key: 'mintNo', width: 110 },
    { title: 'TokenID', dataIndex: 'tokenId', key: 'tokenId', width: 120, render: (v: string) => v || '-' },
    { title: '节点序号', dataIndex: 'nodeIndex', key: 'nodeIndex', width: 90, render: (v: number) => v ?? '-' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const s = nftStatusMap[v] || { color: 'default', text: v }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
  ]

  return (
    <>
      <Card bordered={false} className="filter-card" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="orderNo"><Input placeholder="订单号" allowClear style={{ width: 180 }} /></Form.Item>
          <Form.Item name="walletAddress"><Input placeholder="钱包地址" allowClear style={{ width: 220 }} /></Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="全部状态"
              allowClear
              style={{ width: 130 }}
              options={Object.entries(orderStatusMap).map(([value, s]) => ({ value, label: s.text }))}
            />
          </Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查找</Button></Form.Item>
          <Form.Item><Button onClick={() => { form.resetFields(); setFilters({}); loadData(1, pagination.pageSize, {}) }}>重置</Button></Form.Item>
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
          scroll={{ x: 1320 }}
        />
      </Card>

      <Modal
        title="影视节点订单详情"
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
              <Descriptions.Item label="订单号">{detail.orderNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={orderStatusMap[detail.status]?.color}>{orderStatusMap[detail.status]?.text || detail.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="钱包地址" span={2}>
                <Text copyable style={{ fontFamily: 'Consolas, monospace' }}>{detail.walletAddress}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="数量">{detail.qty}</Descriptions.Item>
              <Descriptions.Item label="单价">{detail.unitPriceUsdt} USDT</Descriptions.Item>
              <Descriptions.Item label="总额">{detail.totalAmountUsdt} USDT</Descriptions.Item>
              <Descriptions.Item label="空投总量">{detail.peakAirdropTotal} PEAK</Descriptions.Item>
              <Descriptions.Item label="支付哈希" span={2}>
                {detail.payTxHash
                  ? <Text copyable style={{ fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>{detail.payTxHash}</Text>
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="支付时间" span={2}>
                {detail.paidAt ? new Date(detail.paidAt).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ margin: '20px 0 12px', fontWeight: 600 }}>NFT 明细</div>
            <Table
              columns={nftColumns}
              dataSource={detail.nfts || []}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 260 }}
              locale={{ emptyText: '暂无 NFT 记录' }}
            />
          </>
        )}
      </Modal>
    </>
  )
}

function GenesisNftsTab() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [form] = Form.useForm()

  const loadData = async (page = 1, pageSize = 10, extra?: Record<string, any>) => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...filters, ...extra }
      const res: any = await getGenesisNfts(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const handleSearch = () => {
    const v = form.getFieldsValue()
    const f: Record<string, any> = {}
    if (v.mintNo) f.mintNo = v.mintNo.trim()
    if (v.tokenId) f.tokenId = v.tokenId.trim()
    if (v.walletAddress) f.walletAddress = v.walletAddress.trim()
    setFilters(f)
    loadData(1, pagination.pageSize, f)
  }

  const columns = [
    { title: '铸造编号', dataIndex: 'mintNo', key: 'mintNo', width: 110, ellipsis: true },
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 190, ellipsis: true, render: (v: string) => v || '-' },
    { title: '钱包地址', dataIndex: 'walletAddress', key: 'walletAddress', width: 150, ellipsis: true, render: walletCell },
    { title: 'TokenID', dataIndex: 'tokenId', key: 'tokenId', width: 120, render: (v: string) => v || '-' },
    { title: '节点序号', dataIndex: 'nodeIndex', key: 'nodeIndex', width: 90, render: (v: number) => v ?? '-' },
    {
      title: '合约地址',
      dataIndex: 'nftContract',
      key: 'nftContract',
      width: 150,
      render: (v: string) => (v ? walletCell(v) : '-'),
    },
    {
      title: '交易哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      width: 150,
      render: (v: string) => (v ? walletCell(v) : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const s = nftStatusMap[v] || { color: 'default', text: v }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '铸造时间',
      dataIndex: 'mintedAt',
      key: 'mintedAt',
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
  ]

  return (
    <>
      <Card bordered={false} className="filter-card" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="mintNo"><Input placeholder="铸造编号" allowClear style={{ width: 150 }} /></Form.Item>
          <Form.Item name="tokenId"><Input placeholder="TokenID" allowClear style={{ width: 150 }} /></Form.Item>
          <Form.Item name="walletAddress"><Input placeholder="钱包地址" allowClear style={{ width: 220 }} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查找</Button></Form.Item>
          <Form.Item><Button onClick={() => { form.resetFields(); setFilters({}); loadData(1, pagination.pageSize, {}) }}>重置</Button></Form.Item>
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
          scroll={{ x: 1240 }}
        />
      </Card>
    </>
  )
}

const saleStatusOptions = [
  { value: 'NOT_STARTED', label: '未开始' },
  { value: 'ON_SALE', label: '销售中' },
  { value: 'PAUSED', label: '已暂停' },
  { value: 'ENDED', label: '已结束' },
]
const saleStatusMap: Record<string, { color: string; text: string }> = {
  NOT_STARTED: { color: 'default', text: '未开始' },
  ON_SALE: { color: 'success', text: '销售中' },
  PAUSED: { color: 'warning', text: '已暂停' },
  ENDED: { color: 'error', text: '已结束' },
}

function GenesisConfigTab() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cfg, setCfg] = useState<any>(null)
  const [form] = Form.useForm()

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res: any = await getGenesisConfigs()
      const list: any[] = res.data || []
      const active = list.find((c) => c.isActive === 1) || list[0] || null
      setCfg(active)
      if (active) {
        form.setFieldsValue({
          totalSupply: active.totalSupply,
          nftPriceUsdt: Number(active.nftPriceUsdt),
          peakAirdrop: Number(active.peakAirdrop),
          maxPerTx: active.maxPerTx,
          status: active.status,
          saleRange: active.saleStartAt && active.saleEndAt
            ? [dayjs(active.saleStartAt), dayjs(active.saleEndAt)]
            : undefined,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadConfig() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const handleSave = async () => {
    const v = await form.validateFields()
    if (!cfg) return
    const [start, end] = v.saleRange || []
    setSaving(true)
    try {
      await updateGenesisConfig(cfg.id, {
        totalSupply: v.totalSupply,
        nftPriceUsdt: v.nftPriceUsdt,
        peakAirdrop: v.peakAirdrop,
        maxPerTx: v.maxPerTx,
        status: v.status,
        saleStartAt: start ? start.toISOString() : null,
        saleEndAt: end ? end.toISOString() : null,
      })
      message.success('销售配置已保存')
      loadConfig()
    } catch (e: any) {
      message.error(e?.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const quickStatus = async (status: GenesisStatus, label: string) => {
    if (!cfg) return
    try {
      await toggleGenesisStatus(cfg.id, status)
      message.success(`已${label}`)
      loadConfig()
    } catch (e: any) {
      message.error(e?.response?.data?.message || '操作失败')
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
  }
  if (!cfg) {
    return <Card bordered={false} style={{ borderRadius: 12 }}><Text type="secondary">暂无销售配置</Text></Card>
  }

  const st = saleStatusMap[cfg.status] || { color: 'default', text: cfg.status }

  return (
    <Row gutter={16}>
      <Col xs={24} lg={14}>
        <Card
          title="销售配置"
          bordered={false}
          style={{ borderRadius: 12 }}
          extra={(
            <Space>
              <Tag color={st.color}>{st.text}</Tag>
              <Button size="small" icon={<ReloadOutlined />} onClick={loadConfig}>刷新</Button>
            </Space>
          )}
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="totalSupply" label="发行总量" rules={[{ required: true, message: '请输入发行总量' }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="nftPriceUsdt" label="单价（USDT）" rules={[{ required: true, message: '请输入单价' }]}>
                  <InputNumber min={0} step={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="peakAirdrop" label="每个节点空投（PEAK）" rules={[{ required: true, message: '请输入空投数量' }]}>
                  <InputNumber min={0} step={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="maxPerTx" label="每次最多购买" rules={[{ required: true, message: '请输入上限' }]}>
                  <InputNumber min={1} max={50} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="saleRange" label="销售起止时间">
                  <RangePicker showTime style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="销售状态" rules={[{ required: true }]}>
                  <Select options={saleStatusOptions} />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存配置</Button>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card title="当前状态" bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}><Statistic title="已售" value={cfg.soldTotal} /></Col>
            <Col span={8}><Statistic title="预铸" value={cfg.premintedTotal} /></Col>
            <Col span={8}><Statistic title="剩余" value={cfg.totalSupply - cfg.soldTotal} /></Col>
            <Col span={8}><Statistic title="配置版本" value={cfg.versionNo} /></Col>
          </Row>
        </Card>
        <Card title="快捷上下架" bordered={false} style={{ borderRadius: 12 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>仅切换销售状态，不改动其它配置。</Text>
            <Space wrap>
              <Popconfirm title="确认上架开售？" onConfirm={() => quickStatus('ON_SALE', '上架')}>
                <Button type="primary">上架开售</Button>
              </Popconfirm>
              <Popconfirm title="确认暂停销售？" onConfirm={() => quickStatus('PAUSED', '暂停')}>
                <Button>暂停销售</Button>
              </Popconfirm>
              <Popconfirm title="确认结束销售？此后不可再购买" onConfirm={() => quickStatus('ENDED', '结束')}>
                <Button danger>结束销售</Button>
              </Popconfirm>
            </Space>
          </Space>
        </Card>
      </Col>
    </Row>
  )
}

export default function GenesisPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab = tabParam === 'nfts' || tabParam === 'config' ? tabParam : 'orders'

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>影视节点</Title>
        <Text type="secondary">影视节点销售订单与 NFT 铸造记录</Text>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => setSearchParams(k === 'orders' ? {} : { tab: k })}
        items={[
          { key: 'orders', label: '影视节点订单', children: <GenesisOrdersTab /> },
          { key: 'nfts', label: 'NFT 记录', children: <GenesisNftsTab /> },
          { key: 'config', label: '销售配置', children: <GenesisConfigTab /> },
        ]}
      />
    </div>
  )
}
