import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Col, Row, Statistic, Tabs, Typography } from 'antd'
import { getDramaOverview, type DramaProject } from '@/api/dramaIpo'
import ProjectsTab from './ProjectsTab'
import SubscriptionsTab from './SubscriptionsTab'
import RevenueTab from './RevenueTab'
import PrincipalTab from './PrincipalTab'

const { Title, Text } = Typography

interface Overview {
  projectCount: number
  openCount: number
  soldOutCount: number
  subscriptionCount: number
  totalShares: number
  totalAmountUsdt: string
  dividendPaidUsdt: string
  principalPaidUsdt: string
}

export default function DramaIpoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'projects'
  const projectId = searchParams.get('projectId') || undefined
  const [overview, setOverview] = useState<Overview | null>(null)

  useEffect(() => {
    getDramaOverview().then((res: any) => setOverview(res.data)).catch(() => {})
  }, [])

  // 从剧目列表点「收益」直接带着剧目跳到收益页
  const goRevenue = (project: DramaProject) => {
    setSearchParams({ tab: 'revenue', projectId: project.id })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>AI 短剧打新</Title>
        <Text type="secondary">剧目上架、认购记录、月度收益与分红结算</Text>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small"><Statistic title="剧目总数" value={overview?.projectCount ?? 0} /></Card>
        </Col>
        <Col span={4}>
          <Card size="small"><Statistic title="打新中" value={overview?.openCount ?? 0} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={4}>
          <Card size="small"><Statistic title="已售罄" value={overview?.soldOutCount ?? 0} /></Card>
        </Col>
        <Col span={4}>
          <Card size="small"><Statistic title="认购份数" value={overview?.totalShares ?? 0} /></Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="累计认购" value={Number(overview?.totalAmountUsdt ?? 0)} precision={0} suffix="U" />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已返本金 / 已分红"
              value={`${Number(overview?.principalPaidUsdt ?? 0).toLocaleString()} / ${Number(overview?.dividendPaidUsdt ?? 0).toLocaleString()}`}
              valueStyle={{ fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={tab}
        onChange={(k) => setSearchParams(k === 'projects' ? {} : { tab: k })}
        items={[
          { key: 'projects', label: '剧目管理', children: <ProjectsTab onGoRevenue={goRevenue} /> },
          { key: 'subscriptions', label: '认购记录', children: <SubscriptionsTab /> },
          { key: 'revenue', label: '月度收益与分红', children: <RevenueTab projectId={projectId} /> },
          { key: 'principal', label: '本金返还', children: <PrincipalTab /> },
        ]}
      />
    </div>
  )
}
