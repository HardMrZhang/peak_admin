import { useEffect, useState } from 'react'
import { App, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getDramaPrincipalReturns, updatePrincipalProof, type DramaPrincipalRow } from '@/api/dramaIpo'
import ImageUpload from './ImageUpload'

const { Text } = Typography

const statusMap: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'processing', text: '待返还' },
  PAID: { color: 'success', text: '已入账' },
  FAILED: { color: 'error', text: '失败' },
}

const short = (v?: string | null) => (!v ? '-' : v.length <= 13 ? v : `${v.slice(0, 6)}...${v.slice(-4)}`)

/** 本金返还计划：第 2、3 个月各 50%，到期由定时任务自动入账，这里只做查看与凭证补录 */
export default function PrincipalTab() {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DramaPrincipalRow[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [form] = Form.useForm()

  const [proofOpen, setProofOpen] = useState(false)
  const [proofRow, setProofRow] = useState<DramaPrincipalRow | null>(null)
  const [proofForm] = Form.useForm()

  const loadData = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const v = form.getFieldsValue()
      const res: any = await getDramaPrincipalReturns({
        page,
        pageSize,
        status: v.status || undefined,
        wallet: v.wallet?.trim() || undefined,
      })
      setData(res.data?.list || [])
      setPagination({ current: page, pageSize, total: res.data?.total || 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1)
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  const openProof = (row: DramaPrincipalRow) => {
    setProofRow(row)
    proofForm.setFieldsValue({ proofUrl: row.proofUrl ?? null })
    setProofOpen(true)
  }

  const handleSaveProof = async () => {
    const v = await proofForm.validateFields()
    await updatePrincipalProof(proofRow!.id, v.proofUrl || '')
    message.success('凭证已保存')
    setProofOpen(false)
    loadData()
  }

  const columns = [
    { title: '认购单号', dataIndex: 'subNo', width: 160 },
    {
      title: '剧目',
      width: 170,
      render: (_: unknown, r: DramaPrincipalRow) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.projectName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.serialNo} · {r.shares} 份</Text>
        </Space>
      ),
    },
    {
      title: '认购地址',
      dataIndex: 'walletAddress',
      width: 130,
      render: (v: string) => (
        <Tooltip title={v}><Text style={{ fontFamily: 'Consolas, monospace' }}>{short(v)}</Text></Tooltip>
      ),
    },
    { title: '期次', dataIndex: 'monthNo', width: 80, render: (v: number) => `第 ${v} 个月` },
    {
      title: '返还金额',
      dataIndex: 'amountUsdt',
      width: 110,
      render: (v: string) => <Text strong>{Number(v).toLocaleString()} U</Text>,
    },
    { title: '到期日', dataIndex: 'dueDate', width: 110, render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: string, r: DramaPrincipalRow) => (
        <Tooltip title={r.errorMessage || undefined}>
          <Tag color={statusMap[v]?.color}>{statusMap[v]?.text || v}</Tag>
        </Tooltip>
      ),
    },
    {
      title: '入账时间',
      dataIndex: 'paidAt',
      width: 150,
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '凭证',
      width: 140,
      fixed: 'right' as const,
      render: (_: unknown, r: DramaPrincipalRow) => (
        <Space size={4}>
          {r.proofUrl ? <Button size="small" type="link" href={r.proofUrl} target="_blank">查看</Button> : null}
          <Button size="small" onClick={() => openProof(r)}>{r.proofUrl ? '更换' : '上传'}</Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="wallet">
            <Input placeholder="认购钱包地址" allowClear style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="status">
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 140 }}
              options={Object.entries(statusMap).map(([value, v]) => ({ value, label: v.text }))}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => loadData(1)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); loadData(1) }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1200 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => loadData(page, pageSize),
        }}
      />

      <Modal
        open={proofOpen}
        title={`上传汇款凭证 · ${proofRow?.subNo ?? ''}`}
        onCancel={() => setProofOpen(false)}
        onOk={handleSaveProof}
        destroyOnClose
      >
        <Form form={proofForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="汇款凭证" name="proofUrl">
            <ImageUpload scope="drama-proof" width={240} height={160} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
