import { useCallback, useEffect, useState } from 'react'
import {
  Alert, App, Button, Card, Descriptions, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  approveAipkSwap,
  confirmAipkSwapSend,
  getAipkSwaps,
  markAipkSwapRefund,
  rejectAipkSwap,
  type AipkSwapRow,
  type AipkSwapStatus,
} from '@/api/aipkSwap'
import { connectWallet, getTxOnchainStatus, sendSplTransfer } from '@/utils/solana'

const { Text, Title, Paragraph } = Typography

const STATUS_TAG: Record<AipkSwapStatus, { color: string; label: string }> = {
  PENDING_TX: { color: 'default', label: '待上链' },
  PENDING_REVIEW: { color: 'gold', label: '待审核' },
  APPROVED: { color: 'blue', label: '已通过·待打款' },
  SUCCESS: { color: 'green', label: '已打款' },
  REJECTED: { color: 'red', label: '已驳回' },
  EXPIRED: { color: 'default', label: '已过期' },
}

const short = (s?: string | null, n = 6) => (s ? `${s.slice(0, n)}…${s.slice(-n)}` : '-')
const solscanTx = (h: string) => `https://solscan.io/tx/${h}`

/**
 * AIpk → USDT 兑换审核：
 *   待审核 → 通过 / 驳回；已通过 → 连接管理员钱包发 USDT 给用户 → 提交 txHash 验链 → 已打款。
 *   驳回后 AIpk 已在平台收款钱包，需人工退回并登记退款交易。
 */
export default function AipkSwapPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [rows, setRows] = useState<AipkSwapRow[]>([])
  const [total, setTotal] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)

  const [current, setCurrent] = useState<AipkSwapRow | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [connectedAddr, setConnectedAddr] = useState('')
  const [txHash, setTxHash] = useState('')
  const [txStatus, setTxStatus] = useState('')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectRemark, setRejectRemark] = useState('')
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundTx, setRefundTx] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const params: Record<string, unknown> = { page, pageSize }
      if (values.status) params.status = values.status
      if (values.wallet) params.wallet = values.wallet.trim()
      if (values.requestNo) params.requestNo = values.requestNo.trim()
      const res: any = await getAipkSwaps(params)
      setRows(res.data?.list ?? [])
      setTotal(res.data?.total ?? 0)
      setPendingCount(res.data?.pendingCount ?? 0)
    } catch (err: any) {
      message.error(err?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [form, page, pageSize, message])

  useEffect(() => { load() }, [load])

  const handleApprove = async (r: AipkSwapRow) => {
    try {
      await approveAipkSwap(r.id)
      message.success('已通过，请发送 USDT 给用户')
      load()
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '操作失败')
    }
  }

  const openReject = (r: AipkSwapRow) => { setCurrent(r); setRejectRemark(''); setRejectOpen(true) }
  const handleReject = async () => {
    if (!current) return
    try {
      await rejectAipkSwap(current.id, rejectRemark)
      message.success('已驳回。用户的 AIpk 已在平台收款钱包，请人工退回并登记退款交易')
      setRejectOpen(false)
      load()
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '操作失败')
    }
  }

  const openRefund = (r: AipkSwapRow) => { setCurrent(r); setRefundTx(r.refundTxHash ?? ''); setRefundOpen(true) }
  const handleRefund = async () => {
    if (!current) return
    try {
      await markAipkSwapRefund(current.id, refundTx.trim())
      message.success('已登记退款交易')
      setRefundOpen(false)
      load()
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '操作失败')
    }
  }

  const openPay = (r: AipkSwapRow) => {
    setCurrent(r)
    setTxHash('')
    setTxStatus('')
    setPayOpen(true)
  }

  const handleConnect = async () => {
    try {
      setConnectedAddr(await connectWallet())
    } catch (err: any) {
      message.warning(err?.message || '钱包连接失败')
    }
  }

  const handleSend = async () => {
    if (!current) return
    setSending(true)
    try {
      const result = await sendSplTransfer('USDT', current.walletAddress, Number(current.usdtAmount).toFixed(6))
      if (result.status === 'failed') {
        setTxHash(''); setTxStatus('')
        message.error('该笔交易上链失败（未扣款），可重新发送')
      } else {
        setTxHash(result.txHash); setTxStatus(result.status)
        if (result.status === 'confirmed') message.success('USDT 转账已确认上链')
        else message.warning('交易已广播但尚未确认。请勿重复发送，点“查询链上状态”核实后再确认完成')
      }
    } catch (err: any) {
      message.error(err?.message || '转账未发出，可重试')
    } finally {
      setSending(false)
    }
  }

  const handleQueryStatus = async () => {
    if (!txHash) return
    const st = await getTxOnchainStatus(txHash)
    setTxStatus(st)
    if (st === 'confirmed') message.success('链上已确认')
    else if (st === 'failed') { message.error('链上失败（未扣款），可重新发送'); setTxHash('') }
    else message.info('仍在确认中')
  }

  const handleConfirmSend = async () => {
    if (!current || !txHash) return
    setConfirming(true)
    try {
      await confirmAipkSwapSend(current.id, txHash)
      message.success('已确认打款，兑换完成')
      setPayOpen(false)
      load()
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '确认失败')
    } finally {
      setConfirming(false)
    }
  }

  const columns: ColumnsType<AipkSwapRow> = [
    { title: '单号', dataIndex: 'requestNo', width: 190, render: (v: string) => <Text copyable={{ text: v }} style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</Text> },
    { title: '用户钱包', dataIndex: 'walletAddress', width: 160, render: (v: string) => <Text copyable={{ text: v }}>{short(v)}</Text> },
    { title: '转入 AIpk', dataIndex: 'aipkAmount', width: 130, align: 'right', render: (v: string) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 }) },
    { title: '应付 USDT', dataIndex: 'usdtAmount', width: 130, align: 'right', render: (v: string) => <Text strong style={{ color: '#10b981' }}>{Number(v).toFixed(2)}</Text> },
    { title: '比例', dataIndex: 'rateUsdt', width: 80, render: (v: string) => `1:${Number(v)}` },
    { title: '转入交易', dataIndex: 'depositTxHash', width: 150, render: (v: string | null) => (v ? <a href={solscanTx(v)} target="_blank" rel="noreferrer">{short(v)}</a> : '-') },
    { title: '打款交易', dataIndex: 'payoutTxHash', width: 150, render: (v: string | null) => (v ? <a href={solscanTx(v)} target="_blank" rel="noreferrer">{short(v)}</a> : '-') },
    { title: '状态', dataIndex: 'status', width: 120, render: (v: AipkSwapStatus) => <Tag color={STATUS_TAG[v]?.color}>{STATUS_TAG[v]?.label ?? v}</Tag> },
    { title: '申请时间', dataIndex: 'createdAt', width: 165, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 230,
      render: (_: unknown, r: AipkSwapRow) => (
        <Space size={4} wrap>
          {r.status === 'PENDING_REVIEW' && (
            <>
              <Popconfirm title="确认通过该兑换？通过后需发送 USDT 给用户" onConfirm={() => handleApprove(r)}>
                <Button type="link" size="small">通过</Button>
              </Popconfirm>
              <Button type="link" size="small" danger onClick={() => openReject(r)}>驳回</Button>
            </>
          )}
          {r.status === 'APPROVED' && (
            <>
              <Button type="link" size="small" icon={<WalletOutlined />} onClick={() => openPay(r)}>发送 USDT</Button>
              <Button type="link" size="small" danger onClick={() => openReject(r)}>驳回</Button>
            </>
          )}
          {r.status === 'REJECTED' && (
            <Button type="link" size="small" onClick={() => openRefund(r)}>{r.refundTxHash ? '修改退款交易' : '登记退款交易'}</Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>AIpk 兑换审核</Title>
        <Text type="secondary">用户把钱包内 AIpk 转入平台收款地址，审核通过后由管理员钱包按 1:1 打 USDT 到用户钱包</Text>
      </div>

      {pendingCount > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={`有 ${pendingCount} 笔兑换待审核`} />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={() => { setPage(1); load() }}>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 150 }} options={Object.entries(STATUS_TAG).filter(([k]) => k !== 'PENDING_TX').map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Form.Item name="wallet"><Input placeholder="用户钱包地址" allowClear style={{ width: 260 }} /></Form.Item>
          <Form.Item name="requestNo"><Input placeholder="单号" allowClear style={{ width: 200 }} /></Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); setPage(1); load() }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1500 }}
        pagination={{
          current: page, pageSize, total, showSizeChanger: true, showTotal: (n) => `共 ${n} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) },
        }}
      />

      {/* 发送 USDT */}
      <Modal
        title="发送 USDT 给用户"
        open={payOpen}
        onCancel={() => setPayOpen(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        {current && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="单号">{current.requestNo}</Descriptions.Item>
              <Descriptions.Item label="用户钱包"><Text copyable>{current.walletAddress}</Text></Descriptions.Item>
              <Descriptions.Item label="转入 AIpk">{Number(current.aipkAmount).toLocaleString()} AIpk（{current.depositTxHash ? <a href={solscanTx(current.depositTxHash)} target="_blank" rel="noreferrer">{short(current.depositTxHash)}</a> : '-'}）</Descriptions.Item>
              <Descriptions.Item label="应付 USDT"><Text strong style={{ color: '#10b981', fontSize: 16 }}>{Number(current.usdtAmount).toFixed(2)} USDT</Text></Descriptions.Item>
            </Descriptions>

            <Space>
              <Button icon={<WalletOutlined />} onClick={handleConnect}>{connectedAddr ? `已连接 ${short(connectedAddr)}` : '连接管理员钱包'}</Button>
              <Button type="primary" loading={sending} disabled={!connectedAddr || !!txHash} onClick={handleSend}>
                {txHash ? '已发送' : `发送 ${Number(current.usdtAmount).toFixed(2)} USDT`}
              </Button>
            </Space>

            <Paragraph style={{ marginBottom: 0 }}>
              <Text type="secondary">或手动粘贴已发送的交易哈希：</Text>
            </Paragraph>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={txHash} onChange={(e) => setTxHash(e.target.value.trim())} placeholder="USDT 转账交易哈希" />
              <Button onClick={handleQueryStatus} disabled={!txHash}>查询链上状态</Button>
            </Space.Compact>
            {txStatus && <Tag color={txStatus === 'confirmed' ? 'green' : txStatus === 'failed' ? 'red' : 'gold'}>{txStatus}</Tag>}

            <Button type="primary" block loading={confirming} disabled={!txHash} onClick={handleConfirmSend}>
              确认完成（服务端验链：收款地址 / USDT / 金额一致）
            </Button>
          </Space>
        )}
      </Modal>

      {/* 驳回 */}
      <Modal title="驳回兑换" open={rejectOpen} onOk={handleReject} onCancel={() => setRejectOpen(false)} okText="确认驳回" okButtonProps={{ danger: true }}>
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="用户的 AIpk 已转入平台收款钱包，驳回后请人工退回并在列表中登记退款交易。" />
        <Input.TextArea rows={3} maxLength={255} value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} placeholder="驳回原因（用户可见）" />
      </Modal>

      {/* 登记退款 */}
      <Modal title="登记 AIpk 退款交易" open={refundOpen} onOk={handleRefund} onCancel={() => setRefundOpen(false)} okText="保存" okButtonProps={{ disabled: refundTx.trim().length < 20 }}>
        {current && (
          <Paragraph type="secondary">
            需退回 <b>{Number(current.aipkAmount).toLocaleString()} AIpk</b> 到 <Text copyable>{current.walletAddress}</Text>
          </Paragraph>
        )}
        <Input value={refundTx} onChange={(e) => setRefundTx(e.target.value)} placeholder="退款交易哈希" />
      </Modal>
    </div>
  )
}
