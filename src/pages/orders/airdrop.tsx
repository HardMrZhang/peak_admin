import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card, Table, Button, Form, Input, Select, Tag, Typography, DatePicker, Tooltip,
  Modal, Descriptions, Spin, App, InputNumber, Space, Alert, Divider,
} from 'antd'
import { EyeOutlined, SearchOutlined, CloudSyncOutlined, ThunderboltOutlined } from '@ant-design/icons'
import {
  getAirdropOrders, getAirdropOrderDetail, getAirdropOnchain, recordAirdropRelease,
} from '@/api/airdrop'
import { triggerChainSync } from '@/api/dapp'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const statusMap: Record<string, { color: string; text: string }> = {
  AIRING: { color: 'processing', text: '空投中' },
  FINISHED: { color: 'success', text: '空投结束' },
}

const shortText = (value?: string | null, head = 8, tail = 6) => {
  if (!value) return '-'
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

export default function AirdropOrdersPage() {
  const { message, modal } = App.useApp()
  const [searchParams] = useSearchParams()
  const initialWallet = searchParams.get('wallet') || ''
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>(initialWallet ? { walletAddress: initialWallet } : {})
  const [form] = Form.useForm()

  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<any>(null)

  // 链上实时状态（详情弹窗内按需加载）
  const [onchainLoading, setOnchainLoading] = useState(false)
  const [onchain, setOnchain] = useState<any>(null)
  const [onchainErr, setOnchainErr] = useState<string>('')

  // 链上补发记账
  const [releaseForm] = Form.useForm()
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [releaseSubmitting, setReleaseSubmitting] = useState(false)

  const loadData = async (page = 1, pageSize = 10, extra?: Record<string, any>) => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...filters, ...extra }
      const res: any = await getAirdropOrders(params)
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialWallet) form.setFieldsValue({ walletAddress: initialWallet })
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const f: Record<string, any> = {}
    if (values.walletAddress) f.walletAddress = values.walletAddress.trim()
    if (values.status) f.status = values.status
    if (values.dateRange) {
      f.startDate = values.dateRange[0].format('YYYY-MM-DD')
      f.endDate = values.dateRange[1].format('YYYY-MM-DD')
    }
    setFilters(f)
    loadData(1, pagination.pageSize, f)
  }

  const loadOnchain = async (id: string) => {
    setOnchainLoading(true)
    setOnchain(null)
    setOnchainErr('')
    try {
      const res: any = await getAirdropOnchain(id)
      setOnchain(res.data)
    } catch (e: any) {
      setOnchainErr(e?.response?.data?.message || e?.message || '读取链上数据失败')
    } finally {
      setOnchainLoading(false)
    }
  }

  const openDetail = async (record: any) => {
    setDetailVisible(true)
    setDetailLoading(true)
    setDetail(null)
    setOnchain(null)
    setOnchainErr('')
    try {
      const res: any = await getAirdropOrderDetail(record.id)
      setDetail(res.data)
      loadOnchain(record.id)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleChainSync = async () => {
    setSyncing(true)
    try {
      await triggerChainSync()
      message.success('链上对账任务已入队，稍后列表数据将与链上同步')
    } catch (e: any) {
      message.error(e?.response?.data?.message || '链上对账触发失败')
    } finally {
      setSyncing(false)
    }
  }

  const openRelease = () => {
    releaseForm.resetFields()
    if (onchain?.exists) {
      releaseForm.setFieldsValue({ day: (onchain.lastReleasedDay || 0) + 1 })
    }
    setReleaseOpen(true)
  }

  const submitRelease = async () => {
    const values = await releaseForm.validateFields()
    modal.confirm({
      title: '确认链上记账发放？',
      content: `将向链上记账第 ${values.day} 天发放 ${values.amount} PEAK，operator 钱包将签名上链并消耗 GAS。`,
      okText: '确认上链',
      cancelText: '取消',
      onOk: async () => {
        setReleaseSubmitting(true)
        try {
          await recordAirdropRelease(detail.id, { day: values.day, amount: values.amount })
          message.success('链上发放记账已提交')
          setReleaseOpen(false)
          loadOnchain(detail.id)
        } catch (e: any) {
          message.error(e?.response?.data?.message || '链上记账失败')
          throw e
        } finally {
          setReleaseSubmitting(false)
        }
      },
    })
  }

  const columns = [
    { title: '订单ID', dataIndex: 'id', key: 'id', width: 90 },
    { title: 'GrantID', dataIndex: 'grantId', key: 'grantId', width: 100 },
    {
      title: '钱包地址',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      width: 180,
      render: (v: string) => (
        <Tooltip title={v}>
          <Text style={{ whiteSpace: 'nowrap', fontFamily: 'Consolas, monospace' }}>{shortText(v, 6, 4)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '投资数量',
      dataIndex: 'principal',
      key: 'principal',
      width: 130,
      sorter: (a: any, b: any) => Number(a.principal) - Number(b.principal),
      render: (v: string) => <Text strong style={{ whiteSpace: 'nowrap' }}>{v} PEAK</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => {
        const s = statusMap[v] || { color: 'default', text: v }
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
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: any) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
      ),
    },
  ]

  const recordColumns = [
    { title: '时间', dataIndex: 'bizDate', key: 'bizDate', width: 120 },
    { title: '摘要', key: 'summary', render: (_: unknown, r: any) => `第 ${r.dayNo} 天发放` },
    { title: '空投数量(PEAK)', dataIndex: 'amount', key: 'amount', width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => <Tag>{v}</Tag>,
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>三倍空投订单</Title>
        <Text type="secondary">查看用户三倍空投参与订单</Text>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={handleSearch}>
          <Form.Item name="dateRange"><RangePicker /></Form.Item>
          <Form.Item name="walletAddress"><Input placeholder="钱包地址" allowClear style={{ width: 220 }} /></Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="全部状态"
              allowClear
              style={{ width: 130 }}
              options={[{ label: '空投中', value: 'AIRING' }, { label: '空投结束', value: 'FINISHED' }]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查找</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => { form.resetFields(); setFilters({}); loadData(1, pagination.pageSize, {}) }}>重置</Button>
          </Form.Item>
          <Form.Item>
            <Button icon={<CloudSyncOutlined />} loading={syncing} onClick={handleChainSync}>链上对账</Button>
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
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title="三倍空投订单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button
            key="release"
            type="primary"
            icon={<ThunderboltOutlined />}
            disabled={!detail}
            onClick={openRelease}
          >
            链上补发记账
          </Button>,
          <Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>,
        ]}
        width={820}
        destroyOnClose
      >
        {detailLoading || !detail ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="订单ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={statusMap[detail.status]?.color}>{statusMap[detail.status]?.text || detail.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="完整钱包地址" span={2}>
                <Text copyable style={{ fontFamily: 'Consolas, monospace' }}>{detail.walletAddress}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="投资数量">{detail.principal} PEAK</Descriptions.Item>
              <Descriptions.Item label="投资时PEAK价格">{detail.price} USDT</Descriptions.Item>
              <Descriptions.Item label="USDT价值">{detail.usdValue} USDT</Descriptions.Item>
              <Descriptions.Item label="三倍后数量">{detail.totalCap} PEAK</Descriptions.Item>
              <Descriptions.Item label="空投比例">{detail.dailyRate}%</Descriptions.Item>
              <Descriptions.Item label="已发放数量">{detail.released} PEAK</Descriptions.Item>
              <Descriptions.Item label="剩余空投数量">{detail.remain} PEAK</Descriptions.Item>
              <Descriptions.Item label="剩余空投天数">{detail.remainDays} 天</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {detail.createdAt ? new Date(detail.createdAt).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '20px 0 12px' }} />
            <Space style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>链上实时状态</span>
              <Button size="small" icon={<CloudSyncOutlined />} loading={onchainLoading} onClick={() => loadOnchain(detail.id)}>刷新</Button>
            </Space>
            {onchainLoading ? (
              <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
            ) : onchainErr ? (
              <Alert type="error" showIcon message={onchainErr} />
            ) : onchain && !onchain.exists ? (
              <Alert type="warning" showIcon message={onchain.message || '链上未找到该空投账户'} />
            ) : onchain ? (
              <>
                {onchain.mirror && !onchain.mirror.releasedConsistent && (
                  <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message="链上已发放数量与数据库镜像不一致，建议执行链上对账"
                  />
                )}
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="链上账户(PDA)" span={2}>
                    <Text copyable style={{ fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>{onchain.pda}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="链上已发放">{onchain.released} PEAK</Descriptions.Item>
                  <Descriptions.Item label="链上剩余">{onchain.remain} PEAK</Descriptions.Item>
                  <Descriptions.Item label="封顶总量">{onchain.totalCap} PEAK</Descriptions.Item>
                  <Descriptions.Item label="每日发放">{onchain.dailyAmount} PEAK</Descriptions.Item>
                  <Descriptions.Item label="最近记账天序号">{onchain.lastReleasedDay}</Descriptions.Item>
                  <Descriptions.Item label="是否出局">{onchain.isOut ? '已出局' : '进行中'}</Descriptions.Item>
                </Descriptions>
              </>
            ) : null}

            <div style={{ margin: '20px 0 12px', fontWeight: 600 }}>空投记录</div>
            <Table
              columns={recordColumns}
              dataSource={detail.releaseLogs || []}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 280 }}
              locale={{ emptyText: '暂无空投记录' }}
            />
          </>
        )}
      </Modal>

      <Modal
        title="链上补发空投记账"
        open={releaseOpen}
        onCancel={() => setReleaseOpen(false)}
        onOk={submitRelease}
        confirmLoading={releaseSubmitting}
        okText="提交上链"
        cancelText="取消"
        destroyOnClose
        width={460}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="将由 operator 钱包对入金合约记账一笔每日发放。天序号须严格大于链上最近记账天序号，链上强制 3 倍封顶。"
        />
        <Form form={releaseForm} layout="vertical">
          <Form.Item name="day" label="天序号(day)" rules={[{ required: true, message: '请输入天序号' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="链下天序号，须严格递增" />
          </Form.Item>
          <Form.Item name="amount" label="发放数量(PEAK)" rules={[{ required: true, message: '请输入发放数量' }]}>
            <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="本次发放的 PEAK 数量" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
