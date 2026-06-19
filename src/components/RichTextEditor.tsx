import { useEffect, useRef, useCallback } from 'react'
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined, StrikethroughOutlined,
  OrderedListOutlined, UnorderedListOutlined, LinkOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, ClearOutlined,
} from '@ant-design/icons'
import { Tooltip } from 'antd'

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  height?: number
}

type ToolButton = {
  icon: React.ReactNode
  title: string
  command: string
  value?: string
}

const colorSwatches = ['#000000', '#ff4d4f', '#fa8c16', '#52c41a', '#1677ff', '#722ed1', '#8c8c8c']

export default function RichTextEditor({ value = '', onChange, placeholder = '请输入公告内容…', height = 220 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastValueRef = useRef<string>('')

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (value !== lastValueRef.current) {
      el.innerHTML = value || ''
      lastValueRef.current = value || ''
    }
  }, [value])

  const emitChange = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    const html = el.innerHTML
    lastValueRef.current = html
    onChange?.(html)
  }, [onChange])

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, val)
    emitChange()
  }, [emitChange])

  const handleLink = useCallback(() => {
    const url = window.prompt('请输入链接地址 (含 http(s)://)')
    if (url) exec('createLink', url)
  }, [exec])

  const toolButtons: ToolButton[] = [
    { icon: <BoldOutlined />, title: '加粗', command: 'bold' },
    { icon: <ItalicOutlined />, title: '斜体', command: 'italic' },
    { icon: <UnderlineOutlined />, title: '下划线', command: 'underline' },
    { icon: <StrikethroughOutlined />, title: '删除线', command: 'strikeThrough' },
    { icon: <UnorderedListOutlined />, title: '无序列表', command: 'insertUnorderedList' },
    { icon: <OrderedListOutlined />, title: '有序列表', command: 'insertOrderedList' },
    { icon: <AlignLeftOutlined />, title: '左对齐', command: 'justifyLeft' },
    { icon: <AlignCenterOutlined />, title: '居中', command: 'justifyCenter' },
    { icon: <AlignRightOutlined />, title: '右对齐', command: 'justifyRight' },
  ]

  const btnStyle: React.CSSProperties = {
    border: 'none', background: 'transparent', cursor: 'pointer',
    padding: '4px 8px', borderRadius: 4, fontSize: 15, color: '#333',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2,
          padding: '6px 8px', borderBottom: '1px solid #f0f0f0', background: '#fafafa',
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <select
          defaultValue=""
          onChange={(e) => { if (e.target.value) { exec('formatBlock', e.target.value); e.target.value = '' } }}
          style={{ ...btnStyle, padding: '2px 4px', border: '1px solid #e0e0e0' }}
          title="标题"
        >
          <option value="">正文样式</option>
          <option value="h1">标题 1</option>
          <option value="h2">标题 2</option>
          <option value="h3">标题 3</option>
          <option value="p">正文</option>
        </select>

        {toolButtons.map((b) => (
          <Tooltip title={b.title} key={b.command}>
            <button type="button" style={btnStyle} onClick={() => exec(b.command, b.value)}>{b.icon}</button>
          </Tooltip>
        ))}

        <Tooltip title="插入链接">
          <button type="button" style={btnStyle} onClick={handleLink}><LinkOutlined /></button>
        </Tooltip>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 4 }}>
          {colorSwatches.map((c) => (
            <Tooltip title="字体颜色" key={c}>
              <button
                type="button"
                onClick={() => exec('foreColor', c)}
                style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid #ddd', background: c, cursor: 'pointer', padding: 0 }}
              />
            </Tooltip>
          ))}
        </span>

        <Tooltip title="清除格式">
          <button type="button" style={btnStyle} onClick={() => exec('removeFormat')}><ClearOutlined /></button>
        </Tooltip>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        className="rich-text-editor__area"
        style={{
          minHeight: height, maxHeight: 420, overflowY: 'auto',
          padding: '10px 12px', outline: 'none', fontSize: 14, lineHeight: 1.6,
        }}
      />
    </div>
  )
}
