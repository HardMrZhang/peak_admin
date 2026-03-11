import { useEffect, useState } from 'react'
import {
  Card, Tabs, Table, Button, Form, DatePicker, Select, Space, message, Typography, Tag, Modal, Tooltip,
} from 'antd'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ExportTaskType } from '@/api/reports'
import {
  getUserAssetsReport, getNodeSalesReport, getRewardsReport, getWithdrawsReport,
  createExportTask, getExportTasks,
} from '@/api/reports'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const shortText = (value?: string | null, head = 8, tail = 6) => {
  if (!value) return '-'
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

const formatAssetAmount = (value?: Record<string, number>) => {
  if (!value || Object.keys(value).length === 0) return '-'
  return Object.entries(value).map(([asset, amount]) => `${asset}:${amount}`).join(' | ')
}

type TabKey = 'user-assets' | 'node-sales' | 'rewards' | 'withdraws'

const tabConfig: Record<TabKey, { label: string; fetcher: Function; exportType: ExportTaskType; columns: any[] }> = {
  'user-assets': {
    label: '用户资产',
    fetcher: getUserAssetsReport,
    exportType: 'USERS',
    columns: [
      {
        title: '用户钱包',
        dataIndex: 'walletAddress',
        key: 'walletAddress',
        width: 180,
        ellipsis: true,
        render: (v: string) => (
          v ? (
            <Tooltip title={v}>
              <Text style={{ whiteSpace: 'nowrap' }}>{shortText(v, 8, 6)}</Text>
            </Tooltip>
          ) : '-'
        ),
      },
      { title: 'USDT 可用', dataIndex: 'usdtAvailable', key: 'usdtAvailable', width: 130 },
      { title: 'USDT 锁定', dataIndex: 'usdtLocked', key: 'usdtLocked', width: 130 },
      { title: 'PEAK 可用', dataIndex: 'peakAvailable', key: 'peakAvailable', width: 130, render: (v: string) => <Text strong style={{ whiteSpace: 'nowrap' }}>{v}</Text> },
      { title: 'PEAK 锁定', dataIndex: 'peakLocked', key: 'peakLocked', width: 130 },
      { title: '邀请码', dataIndex: 'inviteCode', key: 'inviteCode', width: 120, render: (v: string) => <Text style={{ whiteSpace: 'nowrap' }}>{v || '-'}</Text> },
    ],
  },
  'node-sales': {
    label: '节点销售',
    fetcher: getNodeSalesReport,
    exportType: 'ORDERS',
    columns: [
      { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
      { title: '销售数量', dataIndex: 'qty', key: 'qty', width: 100 },
      { title: '销售金额', dataIndex: 'amount', key: 'amount', width: 130, render: (v: string) => <Text strong style={{ whiteSpace: 'nowrap' }}>${v}</Text> },
    ],
  },
  rewards: {
    label: '奖励统计',
    fetcher: getRewardsReport,
    exportType: 'REWARDS',
    columns: [
      { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
      { title: '奖励次数', dataIndex: 'count', key: 'count', width: 100 },
      { title: '奖励金额', dataIndex: 'amount', key: 'amount', width: 130, render: (v: string) => <Text strong style={{ whiteSpace: 'nowrap' }}>{v}</Text> },
    ],
  },
  withdraws: {
    label: '提现统计',
    fetcher: getWithdrawsReport,
    exportType: 'WITHDRAWS',
    columns: [
      { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
      { title: '提现次数', dataIndex: 'count', key: 'count', width: 100 },
      {
        title: '按资产金额',
        dataIndex: 'amountByAsset',
        key: 'amountByAsset',
        width: 260,
        ellipsis: true,
        render: (v: Record<string, number>) => {
          const text = formatAssetAmount(v)
          return text === '-'
            ? '-'
            : (
              <Tooltip title={text}>
                <Text style={{ whiteSpace: 'nowrap' }}>{text}</Text>
              </Tooltip>
            )
        },
      },
    ],
  },
}

const exportTypeOptions: { label: string; value: ExportTaskType }[] = [
  { label: '用户数据', value: 'USERS' },
  { label: '订单数据', value: 'ORDERS' },
  { label: '奖励数据', value: 'REWARDS' },
  { label: '提现数据', value: 'WITHDRAWS' },
  { label: '账本流水', value: 'LEDGER' },
  { label: '风控事件', value: 'RISK' },
]

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('user-assets')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [exports, setExports] = useState<any[]>([])
  const [exportsVisible, setExportsVisible] = useState(false)
  const [exportVisible, setExportVisible] = useState(false)
  const [exportType, setExportType] = useState<ExportTaskType>('USERS')
  const [form] = Form.useForm()

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: Record<string, any> = { page, pageSize }
      if (values.dateRange) {
        params.startDate = values.dateRange[0].format('YYYY-MM-DD')
        params.endDate = values.dateRange[1].format('YYYY-MM-DD')
      }
      const res: any = await tabConfig[tab].fetcher(params)
      const payload = res.data || {}
      const list = payload.list || payload.items || []
      setData(list)
      setPagination({ current: page, pageSize, total: payload.total || list.length || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setData([])
    setPagination({ current: 1, pageSize: 10, total: 0 })
    loadData()
  }, [tab])

  const handleExport = async () => {
    const values = form.getFieldsValue()
    const filters: Record<string, any> = {}
    if (values.dateRange) {
      filters.startDate = values.dateRange[0].format('YYYY-MM-DD')
      filters.endDate = values.dateRange[1].format('YYYY-MM-DD')
    }
    try {
      await createExportTask({ taskType: exportType, filters })
      message.success('导出任务已创建')
      setExportVisible(false)
    } catch { /* empty */ }
  }

  const loadExports = async () => {
    try {
      const res: any = await getExportTasks()
      setExports(res.data?.list || res.data || [])
      setExportsVisible(true)
    } catch { /* empty */ }
  }

  const exportColumns = [
    { title: '导出类型', dataIndex: 'taskType', key: 'taskType', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const map: Record<string, { color: string; text: string }> = {
          PENDING: { color: 'default', text: '待处理' },
          PROCESSING: { color: 'processing', text: '处理中' },
          COMPLETED: { color: 'success', text: '已完成' },
          FAILED: { color: 'error', text: '失败' },
        }
        const s = map[v] || { color: 'default', text: v }
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '文件',
      dataIndex: 'fileUrl',
      key: 'fileUrl',
      render: (v: string) => v ? <a href={v} target="_blank" rel="noreferrer">下载</a> : '-',
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>数据报表</Title>
            <Text type="secondary">查看系统运营数据报表</Text>
          </div>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => { setExportType(tabConfig[tab].exportType); setExportVisible(true) }}
            >
              创建导出
            </Button>
            <Button onClick={loadExports}>导出记录</Button>
          </Space>
        </Space>
      </div>

      <Card bordered={false} className="filter-card" style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={() => loadData()}>
          <Form.Item name="dateRange"><RangePicker /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button></Form.Item>
          <Form.Item><Button onClick={() => { form.resetFields(); loadData() }}>重置</Button></Form.Item>
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as TabKey)}
          items={Object.entries(tabConfig).map(([k, v]) => ({ key: k, label: v.label }))}
        />
        <Table
          className="compact-admin-table"
          columns={tabConfig[tab].columns}
          dataSource={data}
          rowKey={(r, i) => r.id || r.date || `${i}`}
          loading={loading}
          tableLayout="fixed"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => loadData(page, pageSize),
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal title="创建导出任务" open={exportVisible} onOk={handleExport} onCancel={() => setExportVisible(false)} okText="创建">
        <div style={{ marginTop: 16 }}>
          <Text>选择导出类型：</Text>
          <Select
            value={exportType}
            onChange={(v) => setExportType(v)}
            options={exportTypeOptions}
            style={{ width: '100%', marginTop: 8 }}
          />
        </div>
      </Modal>

      <Modal title="导出记录" open={exportsVisible} onCancel={() => setExportsVisible(false)} footer={null} width={700}>
        <Table className="compact-admin-table" tableLayout="fixed" columns={exportColumns} dataSource={exports} rowKey="id" size="small" />
      </Modal>
    </div>
  )
}
