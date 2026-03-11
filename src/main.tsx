import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import router from './router'
import './styles/global.css'

dayjs.locale('zh-cn')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
          colorBgContainer: '#ffffff',
        },
        components: {
          Layout: {
            siderBg: '#0f172a',
            headerBg: '#ffffff',
          },
          Menu: {
            darkItemBg: '#0f172a',
            darkSubMenuItemBg: '#1e293b',
            darkItemSelectedBg: '#6366f1',
          },
        },
      }}
    >
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
)
