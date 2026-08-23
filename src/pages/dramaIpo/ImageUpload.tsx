import { useState } from 'react'
import { Button, Image, Space, Upload, App } from 'antd'
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { uploadDramaFile, type UploadScope } from '@/api/dramaIpo'

// 跨境链路对大体积上传很不稳定（>1MB 经常中途被掐断），
// 上传前统一压到几百 KB 以内，海报类图片视觉上无感。
const COMPRESS_THRESHOLD = 300 * 1024
const MAX_EDGE = 1280

async function compressImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD) return file
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })
    if (blob && blob.size <= COMPRESS_THRESHOLD * 2) {
      return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
    }
  }
  return file
}

interface Props {
  value?: string | null
  onChange?: (url: string | null) => void
  scope: UploadScope
  width?: number
  height?: number
}

/**
 * 受控图片上传：上传成功后把后端返回的公开 URL 交回表单，
 * 表单里存的始终是字符串 URL 而不是 antd 的 fileList，省掉一层转换。
 */
export default function ImageUpload({ value, onChange, scope, width = 120, height = 160 }: Props) {
  const { message } = App.useApp()
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const res: any = await uploadDramaFile(compressed, scope)
      onChange?.(res.data?.url ?? null)
      message.success('上传成功')
    } finally {
      setUploading(false)
    }
    return false
  }

  return (
    <Space direction="vertical" size={8}>
      {value ? (
        <Image
          src={value}
          width={width}
          height={height}
          style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }}
        />
      ) : null}
      <Space>
        <Upload accept="image/*" showUploadList={false} beforeUpload={handleUpload}>
          <Button icon={<UploadOutlined />} loading={uploading} size="small">
            {value ? '重新上传' : '上传图片'}
          </Button>
        </Upload>
        {value ? (
          <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onChange?.(null)}>
            移除
          </Button>
        ) : null}
      </Space>
    </Space>
  )
}
