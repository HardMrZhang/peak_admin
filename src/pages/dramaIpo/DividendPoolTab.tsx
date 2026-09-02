import { useCallback, useEffect, useState } from 'react'
import { Alert, App, Button, Card, Col, Descriptions, Form, Input, InputNumber, Modal, Row, Space, Statistic, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { assetLabel } from '@/utils/asset'
import { depositDramaDividendPool, getDramaDividendPool, type DramaDividendPool } from '@/api/dramaIpo'

const { Text, Paragraph } = Typography

/**
 * 链上分红池：每天把短剧真实收益的 40% 入金，合约按份额加权累计，用户每周自行领取。
 * 入金时后端会先推进到期仓位，再按这笔入金的加权分摊给上级发放级差 / 平级（Aipk 账本）。
 */
export default function DividendPoolTab() {
  const { message, modal } = App.useApp()
  const [pool, setPool] = useState<DramaDividendPool | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<{ amount: number; remark?: string }>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await getDramaDividendPool()
      setPool(res.data)
    } catch (err: any) {
      message.error(err?.message || '加载分红池失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => { load() }, [load])

  const asset = assetLabel(pool?.rewardAsset)

  const handleDeposit = async () => {
    const values = await form.validateFields()
    modal.confirm({
      title: '确认入金到链上分红池？',
      content: (
        <div>
          <Paragraph>金额：<b>{values.amount} {asset}</b>（从 operator 钱包的 {asset} 代币账户转入池子金库）</Paragraph>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            入金后立即按当前全网活跃份额 {pool?.totalActiveShares ?? '0'} 加权累计到各仓位，用户每周可领取一次；
            同时按这笔入金给上级发放团队级差 / 平级（Aipk 账本）。此操作不可撤销。
          </Paragraph>
        </div>
      ),
      okText: '确认入金',
      onOk: async () => {
        setSubmitting(true)
        try {
          const res: any = await depositDramaDividendPool({ amount: String(values.amount), remark: values.remark })
          const d = res.data
          Modal.success({
            title: '入金成功',
            content: (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="金额">{d.amount} {asset}</Descriptions.Item>
                <Descriptions.Item label="交易">
                  <a href={`https://solscan.io/tx/${d.txHash}`} target="_blank" rel="noreferrer">{d.txHash}</a>
                </Descriptions.Item>
                <Descriptions.Item label="级差/平级">
                  {d.dynamic?.error
                    ? <Text type="danger">发放失败：{d.dynamic.error}</Text>
                    : `${d.dynamic?.rewards ?? 0} 笔，合计 ${d.dynamic?.aipkTotal ?? '0'} Aipk（覆盖 ${d.dynamic?.positions ?? 0} 个活跃仓位）`}
                </Descriptions.Item>
              </Descriptions>
            ),
          })
          form.resetFields()
          load()
        } catch (err: any) {
          message.error(err?.response?.data?.message || err?.message || '入金失败')
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  if (pool && !pool.enabled) {
    return <Alert type="warning" showIcon message="链上分红池未启用" description="后端未配置 SHARE_DIVIDEND_PROGRAM_ID，分红仍走月度收益结算。" />
  }
  if (pool && pool.enabled && !pool.initialized) {
    return <Alert type="error" showIcon message="分红池合约尚未初始化" description="请先执行 drama_dividend_contract/scripts/init-config.ts。" />
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        size="small"
        title={<Space>链上分红池状态 {pool?.paused ? <Tag color="red">已暂停</Tag> : <Tag color="green">运行中</Tag>}</Space>}
        extra={<Button icon={<ReloadOutlined />} size="small" onClick={load} loading={loading}>刷新</Button>}
      >
        <Row gutter={16}>
          <Col span={6}><Statistic title="全网活跃份额" value={Number(pool?.totalActiveShares ?? 0)} suffix="U" /></Col>
          <Col span={6}><Statistic title="全网已登记份额" value={Number(pool?.totalRegisteredShares ?? 0)} suffix="U" /></Col>
          <Col span={6}><Statistic title="活跃 / 已结束 / 总仓位" value={`${pool?.activePositions ?? 0} / ${pool?.endedPositions ?? 0} / ${pool?.positionCount ?? 0}`} valueStyle={{ fontSize: 18 }} /></Col>
          <Col span={6}><Statistic title="入金次数" value={Number(pool?.depositCount ?? 0)} /></Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={6}><Statistic title="累计入金" value={Number(pool?.totalDeposited ?? 0)} precision={2} suffix={asset} /></Col>
          <Col span={6}><Statistic title="累计用户已领（含手续费）" value={Number(pool?.totalClaimed ?? 0)} precision={2} suffix={asset} /></Col>
          <Col span={6}><Statistic title="累计手续费" value={Number(pool?.totalFee ?? 0)} precision={2} suffix={asset} /></Col>
          <Col span={6}><Statistic title="待分配暂存（无活跃份额时入金）" value={Number(pool?.carry ?? 0)} precision={2} suffix={asset} /></Col>
        </Row>
        <Descriptions size="small" column={3} style={{ marginTop: 16 }}>
          <Descriptions.Item label="分红币种">{asset}（{pool?.rewardMint}）</Descriptions.Item>
          <Descriptions.Item label="金库">{pool?.vault}</Descriptions.Item>
          <Descriptions.Item label="最近入金">{pool?.lastDepositAt ? dayjs(pool.lastDepositAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
          <Descriptions.Item label="分红窗口">签约后第 {pool?.dividendStartDay} 天起，持续 {pool?.dividendDays} 天</Descriptions.Item>
          <Descriptions.Item label="领取间隔">{Math.round((pool?.claimIntervalSecs ?? 0) / 86400)} 天</Descriptions.Item>
          <Descriptions.Item label="领取手续费">{Math.round((pool?.claimFeeRate ?? 0) * 100)}%</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="每日入金（当天短剧真实收益的 40%）">
        <Form form={form} layout="inline" onFinish={handleDeposit}>
          <Form.Item
            name="amount"
            label={`金额（${asset}）`}
            rules={[{ required: true, message: '请输入入金金额' }, { type: 'number', min: 0.000000001, message: '金额必须大于 0' }]}
          >
            <InputNumber style={{ width: 220 }} min={0} precision={4} placeholder="例：1200.5" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input style={{ width: 280 }} maxLength={255} placeholder="例：2026-09-02 各平台收益合计 3001.25U × 40%" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>入金到分红池</Button>
          </Form.Item>
        </Form>
        <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          资金来源为 operator 钱包（9yFg…）的 {asset} 代币账户，请确保余额充足。入金前系统会自动把到期仓位激活 / 结束，
          按当时的全网活跃份额加权分配；用户在前端「AI 打新」页每天可看到累计分红，每周领取一次。
        </Paragraph>
      </Card>
    </Space>
  )
}
