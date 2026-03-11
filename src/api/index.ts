import axios from 'axios'
import { message } from 'antd'

interface ApiRes<T = unknown> {
  code: number
  message: string
  data: T
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('peak_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const res = response.data as ApiRes
    if (res.code !== 0) {
      message.error(res.message || '请求失败')
      if (res.code === 401) {
        localStorage.removeItem('peak_admin_token')
        window.location.href = '/login'
      }
      if (res.code === 403) {
        message.error('无权限执行此操作')
      }
      return Promise.reject(new Error(res.message))
    }
    return response.data
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('peak_admin_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    if (status === 403) {
      message.error('无权限执行此操作')
      return Promise.reject(error)
    }
    message.error(error.response?.data?.message || '网络错误')
    return Promise.reject(error)
  }
)

export default request
