import React, { useEffect, useRef } from 'react'

import { Button } from '../Button'

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void
  disabled?: boolean
}

/**
 * 외부 라이브러리 없이 HTML5 canvas + pointer 이벤트만으로 동작하는 간단한 서명 캡처 패드입니다.
 * 빈 캔버스 상태에서는 onChange(null)을, 한 번이라도 그려지면 onChange(dataUrl)을 호출합니다.
 */
export function SignaturePad({ onChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const hasStrokeRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(rect.width * ratio))
    canvas.height = Math.max(1, Math.round(rect.height * ratio))
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      // 내보내는 PNG가 투명 배경이면 어두운 화면에서 검은 획이 안 보인다 → 흰 배경을 먼저 칠한다
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, rect.width, rect.height)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1E293B'
    }
  }, [])

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    lastPointRef.current = getPoint(e)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || !isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const point = getPoint(e)
    const last = lastPointRef.current
    if (last) {
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }
    lastPointRef.current = point
    hasStrokeRef.current = true
  }

  function finishStroke() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    const canvas = canvasRef.current
    if (canvas && hasStrokeRef.current) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  function handleClear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // 흰 배경 유지(내보내는 PNG가 투명이 되지 않도록). scale이 적용된 좌표계이므로 CSS 크기로 칠한다
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, rect.width, rect.height)
    hasStrokeRef.current = false
    onChange(null)
  }

  return (
    <div data-mbaas-oid="sigpad1">
      <canvas
        data-mbaas-oid="sigpad2"
        ref={canvasRef}
        role="img"
        aria-label="교관 서명 입력 영역. 마우스 또는 손가락으로 이 영역에 서명해 주세요."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={finishStroke}
        onPointerCancel={finishStroke}
        className={`h-40 w-full touch-none rounded-control border border-white/15 bg-white ${
          disabled ? 'opacity-50' : ''
        }`}
      />
      <div data-mbaas-oid="sigpad3" className="mt-2 flex items-center justify-between gap-3">
        <p data-mbaas-oid="sigpad4" className="text-xs text-slate-400">
          마우스 또는 손가락으로 서명해 주세요.
        </p>
        <Button
          data-mbaas-oid="sigpad5"
          type="button"
          variant="outline"
          tone="neutral"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
        >
          지우기
        </Button>
      </div>
    </div>
  )
}
