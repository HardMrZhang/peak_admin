import { useEffect, useMemo, useState } from 'react'
import {
  Alert, App, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Select, Space, Statistic, Table, Tag, Typography,
} from 'antd'
import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  confirmDividendPeriod, deleteDramaRevenue, getDramaProjects, getDramaRevenue,
  upsertDramaRevenue, type DramaProject, type DramaRevenueView,
} from '@/api/dramaIpo'
import ImageUpload from './ImageUpload'

const { Text, Title } = Typography

/**
 * 月度收益录入：按「期数 × 平台」填各平台收益并附汇款凭证，
 * 确认某期后 合计 × 40% 落分红池，由 drama_ipo_dividend_settle 任务按份数分摊入账。
 */
export default function RevenueTab({ projectId: initialProjectId }: { projectId?: string }) {
  const { message } = App.useApp()
  const [projects, setProjects] = useState<DramaProject[]>([])
  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId)
  const [view, setView] = useState<DramaRevenueView | null>(null)
  const [loading, setLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmForm] = Form.useForm()

  const loadProjects = async () => {
    const res: any = await getDramaProjects({ page: 1, pageSize: 100 })
    setProjects(res.data?.list || [])
  }

  const loadView = async (id?: string) => {
    if (!id) { setView(null); return }
    setLoading(true)
    try {
      const res: any = await getDramaRevenue(id)
      setView(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  useEffect(() => {
    setProjectId(initialProjectId)
  }, [initialProjectId])

  useEffect(() => {
    loadView(projectId)
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [projectId])

  // 期数 × 平台的二维表：每行一期，每列一个平台
  const rows = useMemo(() => {
    if (!view) return []
    return Array.from({ length: view.totalPeriods }, (_, i) => {
      const periodNo = i + 1
      const entries = view.entries.filter((e) => e.periodNo === periodNo)
      const period = view.periods.find((p) => p.periodNo === periodNo)
      const total = entries.reduce((sum, e) => sum + Number(e.revenueUsdt), 0)
      return {
        key: periodNo,
        periodNo,
        entries,
        period,
        total,
        pool: (total * view.dividendRatioBps) / 10000,
      }
    })
  }, [view])

  const openEdit = (periodNo: number, platformId: string) => {
    const entry = view?.entries.find((e) => e.periodNo === periodNo && e.platformId === platformId)
    form.setFieldsValue({
      periodNo,
      platformId,
      revenueUsdt: entry ? Number(entry.revenueUsdt) : undefined,
      proofUrl: entry?.proofUrl ?? null,
      remark: entry?.remark ?? undefined,
    })
    setEditOpen(true)
  }

  const handleSaveEntry = async () => {
    const v = await form.validateFields()
    setSaving(true)
    try {
      await upsertDramaRevenue({ ...v, projectId })
      message.success('已保存')
      setEditOpen(false)
      loadView(projectId)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    await deleteDramaRevenue(id)
    message.success('已删除')
    loadView(projectId)
  }

  const openConfirm = (periodNo: number) => {
    const period = view?.periods.find((p) => p.periodNo === periodNo)
    confirmForm.setFieldsValue({ periodNo, proofUrl: period?.proofUrl ?? null })
    setConfirmOpen(true)
  }

  const handleConfirmPeriod = async () => {
    const v = await confirmForm.validateFields()
    const res: any = await confirmDividendPeriod({ projectId: projectId!, ...v })
    message.success(`第 ${v.periodNo} 期已确认，分红池 ${res.data?.dividendPoolUsdt} USDT`)
    setConfirmOpen(false)
    loadView(projectId)
  }

  const platformColumns = (view?.platforms || []).map((p) => ({
    title: p.name,
    key: p.id,
    width: 160,
    render: (_: unknown, r: (typeof rows)[number]) => {
      const entry = r.entries.find((e) => e.platformId === p.id)
      const settled = r.period?.status === 'SETTLED'
      return (
        <Space direction="vertical" size={2}>
          <Text strong={!!entry}>{entry ? `${Number(entry.revenueUsdt).toLocaleString()} U` : '-'}</Text>
          <Space size={4}>
            <Button size="small" type="link" disabled={settled} onClick={() => openEdit(r.periodNo, p.id!)}>
              {entry ? '修改' : '录入'}
            </Button>
            {entry?.proofUrl ? (
              <Button size="small" type="link" href={entry.proofUrl} target="_blank">凭证</Button>
            ) : null}
            {entry && !settled ? (
              <Popconfirm title="删除该条收益？" onConfirm={() => handleDeleteEntry(entry.id)}>
                <Button size="small" type="link" danger>删除</Button>
              </Popconfirm>
            ) : null}
          </Space>
        </Space>
      )
    },
  }))

  const columns = [
    {
      title: '期数',
      dataIndex: 'periodNo',
      width: 90,
      fixed: 'left' as const,
      render: (v: number) => <Text strong>第 {v} 期</Text>,
    },
    ...platformColumns,
    {
      title: '合计收益',
      width: 120,
      render: (_: unknown, r: (typeof rows)[number]) => `${r.total.toLocaleString()} U`,
    },
    {
      title: `分红池 (${(view?.dividendRatioBps ?? 4000) / 100}%)`,
      width: 120,
      render: (_: unknown, r: (typeof rows)[number]) => (
        <Text strong style={{ color: '#1677ff' }}>{r.pool.toLocaleString()} U</Text>
      ),
    },
    {
      title: '状态',
      width: 180,
      fixed: 'right' as const,
      render: (_: unknown, r: (typeof rows)[number]) => {
        if (r.period?.status === 'SETTLED') {
          return (
            <Space direction="vertical" size={0}>
              <Tag color="success">已结算</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {r.period.settledAt ? dayjs(r.period.settledAt).format('MM-DD HH:mm') : ''} · {r.period.totalShares} 份
              </Text>
            </Space>
          )
        }
        if (r.period?.status === 'CONFIRMED') {
          return (
            <Space direction="vertical" size={2}>
              <Tag color="processing">待结算</Tag>
              <Button size="small" onClick={() => openConfirm(r.periodNo)}>重新确认</Button>
            </Space>
          )
        }
        return (
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            disabled={r.total <= 0}
            onClick={() => openConfirm(r.periodNo)}
          >
            确认本期
          </Button>
        )
      },
    },
  ]

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="分红已改为链上分红池每日入金（见「分红池」页签）"
        description="此处仅作各平台收益的录入与公示（前端「收益披露」读取）。链上分红池启用后，「确认分红期」不再往用户 USDT 账本发放分红，避免与链上分红重复。"
      />
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Text>选择剧目：</Text>
          <Select
            style={{ width: 320 }}
            value={projectId}
            onChange={setProjectId}
            placeholder="请选择剧目"
            showSearch
            optionFilterProp="label"
            options={projects.map((p) => ({ value: p.id, label: `${p.serialNo} ${p.name}` }))}
          />
          <Button icon={<ReloadOutlined />} onClick={() => loadView(projectId)}>刷新</Button>
        </Space>
      </Card>

      {!projectId ? (
        <Empty description="请先选择剧目" />
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="确认某期后，该期各平台收益合计 × 40% 作为分红池，由定时任务按份数分摊入账；已结算的期数不可再修改。"
          />
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic title="累计收益" value={rows.reduce((s, r) => s + r.total, 0)} suffix="USDT" precision={2} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="累计分红池" value={rows.reduce((s, r) => s + r.pool, 0)} suffix="USDT" precision={2} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="已结算期数" value={rows.filter((r) => r.period?.status === 'SETTLED').length} suffix={`/ ${view?.totalPeriods ?? 10}`} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="上线平台" value={view?.platforms.length ?? 0} suffix="个" />
              </Card>
            </Col>
          </Row>

          {(view?.platforms.length ?? 0) === 0 ? (
            <Empty description="该剧目尚未配置上线平台，请先在「剧目管理」中添加" />
          ) : (
            <Table
              rowKey="key"
              loading={loading}
              columns={columns}
              dataSource={rows}
              pagination={false}
              scroll={{ x: 400 + (view?.platforms.length ?? 0) * 160 }}
            />
          )}
        </>
      )}

      <Modal
        open={editOpen}
        title="录入平台收益"
        onCancel={() => setEditOpen(false)}
        onOk={handleSaveEntry}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="periodNo" hidden><InputNumber /></Form.Item>
          {/* 平台 ID 是 BigInt 字符串，用 Input 承载避免数字精度丢失 */}
          <Form.Item name="platformId" hidden><Input /></Form.Item>
          <Form.Item label="收益金额（USDT）" name="revenueUsdt" rules={[{ required: true, message: '请输入收益金额' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="汇款凭证" name="proofUrl">
            <ImageUpload scope="drama-proof" width={200} height={140} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={confirmOpen}
        title="确认本期分红"
        onCancel={() => setConfirmOpen(false)}
        onOk={handleConfirmPeriod}
        destroyOnClose
      >
        <Form form={confirmForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="periodNo" hidden><InputNumber /></Form.Item>
          <Title level={5}>确认后将按各平台收益合计的 40% 生成分红池</Title>
          <Text type="secondary">实际分摊入账由定时任务执行，按各认购单持有份数比例分配。</Text>
          <Form.Item label="本期汇总凭证（可选）" name="proofUrl" style={{ marginTop: 16 }}>
            <ImageUpload scope="drama-proof" width={200} height={140} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
