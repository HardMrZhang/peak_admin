import { useEffect, useState } from 'react'
import {
  App, Button, Card, Col, DatePicker, Descriptions, Form, Input, InputNumber,
  Modal, Popconfirm, Row, Select, Space, Table, Tag, Tooltip, Typography,
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  confirmDramaProject, createDramaProject, deleteDramaProject, getDramaProjects,
  setDramaProjectStatus, updateDramaProject,
  type DramaProject, type DramaProjectStatus,
} from '@/api/dramaIpo'
import ImageUpload from './ImageUpload'

const { Text } = Typography
const { TextArea } = Input

const statusMap: Record<DramaProjectStatus, { color: string; text: string }> = {
  DRAFT: { color: 'default', text: '草稿' },
  PENDING: { color: 'processing', text: '待开盘' },
  OPEN: { color: 'success', text: '打新中' },
  SOLD_OUT: { color: 'warning', text: '已售罄' },
  CLOSED: { color: 'error', text: '已关闭' },
}

const SHARE_PRICE_DEFAULT = 100

export default function ProjectsTab({ onGoRevenue }: { onGoRevenue: (project: DramaProject) => void }) {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DramaProject[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [searchForm] = Form.useForm()

  const [editing, setEditing] = useState<DramaProject | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const loadData = async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true)
    try {
      const v = searchForm.getFieldsValue()
      const res: any = await getDramaProjects({
        page,
        pageSize,
        keyword: v.keyword?.trim() || undefined,
        status: v.status || undefined,
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

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sharePriceUsdt: SHARE_PRICE_DEFAULT, seriesNo: 1, platforms: [] })
    setModalOpen(true)
  }

  const openEdit = (record: DramaProject) => {
    setEditing(record)
    form.setFieldsValue({
      ...record,
      totalInvestUsdt: Number(record.totalInvestUsdt),
      sharePriceUsdt: Number(record.sharePriceUsdt),
      premiereAt: record.premiereAt ? dayjs(record.premiereAt) : null,
      closeAt: record.closeAt ? dayjs(record.closeAt) : null,
      platforms: record.platforms || [],
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const v = await form.validateFields()
    setSaving(true)
    try {
      const body = {
        ...v,
        premiereAt: v.premiereAt ? v.premiereAt.toISOString() : null,
        closeAt: v.closeAt ? v.closeAt.toISOString() : null,
        platforms: (v.platforms || []).filter((p: any) => p?.name),
      }
      if (editing) {
        // 已确认上架的剧目份数已写链，后端会拒绝改动投资额与单价，这里先剔除避免整单失败
        if (editing.status !== 'DRAFT') {
          delete body.totalInvestUsdt
          delete body.sharePriceUsdt
        }
        await updateDramaProject(editing.id, body)
        message.success('已保存')
      } else {
        await createDramaProject(body)
        message.success('已创建草稿')
      }
      setModalOpen(false)
      loadData()
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async (record: DramaProject) => {
    const res: any = await confirmDramaProject(record.id)
    message.success(`已确认上架，将于 ${dayjs(res.data?.openAt).format('MM-DD HH:mm')} 开盘`)
    loadData()
  }

  const handleStatus = async (record: DramaProject, status: DramaProjectStatus) => {
    await setDramaProjectStatus(record.id, status)
    message.success('状态已更新')
    loadData()
  }

  const handleDelete = async (record: DramaProject) => {
    await deleteDramaProject(record.id)
    message.success('已删除')
    loadData()
  }

  const columns = [
    { title: '编号', dataIndex: 'serialNo', width: 90 },
    {
      title: '剧目',
      dataIndex: 'name',
      width: 200,
      render: (v: string, r: DramaProject) => (
        <Space>
          {r.posterUrl ? (
            <img src={r.posterUrl} alt="" style={{ width: 32, height: 44, objectFit: 'cover', borderRadius: 4 }} />
          ) : null}
          <Space direction="vertical" size={0}>
            <Text strong>{v}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {[r.grade && `${r.grade}级`, r.genre].filter(Boolean).join(' · ') || '-'}
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '总投资 / 每份',
      width: 150,
      render: (_: unknown, r: DramaProject) => (
        <Space direction="vertical" size={0}>
          <Text>{Number(r.totalInvestUsdt).toLocaleString()} USDT</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{Number(r.sharePriceUsdt)} USDT/份</Text>
        </Space>
      ),
    },
    {
      title: '份数',
      width: 140,
      render: (_: unknown, r: DramaProject) => (
        <Space direction="vertical" size={0}>
          <Text>{r.soldShares} / {r.totalShares}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>剩余 {r.remainingShares} 份</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v: DramaProjectStatus) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text || v}</Tag>,
    },
    {
      title: '开盘时间',
      dataIndex: 'openAt',
      width: 150,
      render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '链上',
      dataIndex: 'chainSaleAddr',
      width: 110,
      render: (v: string | null) => (v
        ? <Tooltip title={v}><Tag color="blue">已上链</Tag></Tooltip>
        : <Tag>未上链</Tag>),
    },
    {
      title: '操作',
      width: 260,
      fixed: 'right' as const,
      render: (_: unknown, r: DramaProject) => (
        <Space size={4} wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Button size="small" onClick={() => onGoRevenue(r)}>收益</Button>
          {r.status === 'DRAFT' && (
            <Popconfirm
              title="确认上架？"
              description="确认后 24 小时开盘，投资额与份数将不可再修改"
              onConfirm={() => handleConfirm(r)}
            >
              <Button size="small" type="primary">确认上架</Button>
            </Popconfirm>
          )}
          {(r.status === 'OPEN' || r.status === 'PENDING') && (
            <Popconfirm title="确认关闭打新？" onConfirm={() => handleStatus(r, 'CLOSED')}>
              <Button size="small" danger>关闭</Button>
            </Popconfirm>
          )}
          {r.status === 'DRAFT' && (
            <Popconfirm title="确认删除该草稿？" onConfirm={() => handleDelete(r)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const totalInvest = Form.useWatch('totalInvestUsdt', form)
  const sharePrice = Form.useWatch('sharePriceUsdt', form)
  const derivedShares = Number(totalInvest) > 0 && Number(sharePrice) > 0
    ? Math.floor(Number(totalInvest) / Number(sharePrice))
    : 0

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline">
          <Form.Item name="keyword">
            <Input placeholder="剧目名称 / 编号" allowClear style={{ width: 200 }} />
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
              <Button icon={<ReloadOutlined />} onClick={() => { searchForm.resetFields(); loadData(1) }}>重置</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增剧目</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1300 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => loadData(page, pageSize),
        }}
        expandable={{
          expandedRowRender: (r) => (
            <Descriptions size="small" column={3} bordered>
              <Descriptions.Item label="集数">{r.totalEpisodes ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="总时长">{r.runtimeMinutes ? `${r.runtimeMinutes} 分钟` : '-'}</Descriptions.Item>
              <Descriptions.Item label="上映时间">{r.premiereAt ? dayjs(r.premiereAt).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
              <Descriptions.Item label="编剧">{r.screenwriter ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="导演">{r.director ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="美术">{r.artDirector ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="制片">{r.producer ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="系列">{`系列剧-${r.seriesNo}`}</Descriptions.Item>
              <Descriptions.Item label="认购笔数">{r.subscriptionCount ?? 0}</Descriptions.Item>
              <Descriptions.Item label="上线平台" span={3}>
                {r.platforms.length
                  ? (
                    <Space wrap>
                      {r.platforms.map((p) => (
                        <Tag key={p.id}>
                          {p.logoUrl ? <img src={p.logoUrl} alt="" style={{ width: 14, height: 14, marginRight: 4, verticalAlign: -2 }} /> : null}
                          {p.name}
                        </Tag>
                      ))}
                    </Space>
                  )
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="简介" span={3}>
                <div dangerouslySetInnerHTML={{ __html: r.synopsisHtml || '-' }} />
              </Descriptions.Item>
            </Descriptions>
          ),
        }}
      />

      <Modal
        open={modalOpen}
        title={editing ? `编辑剧目 ${editing.serialNo}` : '新增剧目'}
        width={900}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="海报" name="posterUrl">
                <ImageUpload scope="drama-poster" />
              </Form.Item>
            </Col>
            <Col span={18}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="剧目名称" name="name" rules={[{ required: true, message: '请输入剧目名称' }]}>
                    <Input placeholder="如：齐天大圣" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="级别" name="grade">
                    <Select
                      allowClear
                      placeholder="S / A / B"
                      options={['S', 'A', 'B', 'C'].map((v) => ({ value: v, label: `${v} 级` }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="系列剧编号" name="seriesNo">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="类型" name="genre">
                    <Input placeholder="如：异兽跨种族 / 都市奇幻 / 禁忌爱情" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="集数" name="totalEpisodes">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="总时长（分钟）" name="runtimeMinutes">
                    <Input placeholder="如 70-80" />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="总投资（USDT）"
                name="totalInvestUsdt"
                rules={[{ required: true, message: '请输入总投资额' }]}
                extra={editing && editing.status !== 'DRAFT' ? '已上架，不可修改' : undefined}
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  disabled={!!editing && editing.status !== 'DRAFT'}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="每份金额（USDT）" name="sharePriceUsdt">
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  disabled={!!editing && editing.status !== 'DRAFT'}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="总份数（自动计算）">
                <InputNumber value={derivedShares} disabled style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="编剧" name="screenwriter"><Input /></Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="导演" name="director"><Input /></Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="美术" name="artDirector"><Input /></Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="制片" name="producer"><Input /></Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="上映时间" name="premiereAt">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="打新截止时间（可空）" name="closeAt">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="剧情简介" name="synopsisHtml">
            <TextArea rows={4} placeholder="支持 HTML 片段" />
          </Form.Item>

          <Form.Item label="上线平台">
            <Form.List name="platforms">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} align="start">
                      <Form.Item {...restField} name={[name, 'name']} noStyle>
                        <Input placeholder="平台名称" style={{ width: 180 }} />
                      </Form.Item>
                      <Form.Item {...restField} name={[name, 'logoUrl']} noStyle>
                        <ImageUpload scope="drama-platform" width={48} height={48} />
                      </Form.Item>
                      <Button danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name: '' })} block>
                    添加平台
                  </Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
