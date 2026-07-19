// SPDX-FileCopyrightText: 2026 Bingoo.ai
// SPDX-License-Identifier: Apache-2.0

import type { Rect } from '@bingoo.ai/explainer-core'
import type { JSX } from 'react'
import type { PainterProps } from './registry.js'
import { centreOf, edgePoint } from './connector.js'
import { color, defaultTheme } from '../theme/tokens.js'

/**
 * A node-and-edge diagram: flow, tree, cycle or grid.
 *
 * Node positions are computed **once for the whole graph** and never change as nodes are
 * revealed. A diagram that re-centres itself each time a node appears is unreadable while
 * it builds, and it also makes the learner re-find everything they had already located.
 *
 * Edges are inset by intersecting each node's box, the same routing connectors use. Bingoo
 * insets edges by a hardcoded 100 units instead, which draws the arrow **backwards**
 * whenever two nodes are closer together than that — common in any tall tree.
 */

type NodeShape = 'box' | 'diamond' | 'circle' | 'pill'
type LayoutKind = 'flow' | 'tree' | 'cycle' | 'grid'

interface DiagramNode {
  readonly id: string
  readonly label: string
  readonly shape: NodeShape
}

interface DiagramEdge {
  readonly from: string
  readonly to: string
  readonly label?: string
}

interface Parsed {
  readonly nodes: readonly DiagramNode[]
  readonly edges: readonly DiagramEdge[]
  readonly kind: LayoutKind
}

const SHAPES: readonly NodeShape[] = ['box', 'diamond', 'circle', 'pill']
const KINDS: readonly LayoutKind[] = ['flow', 'tree', 'cycle', 'grid']

function parse(content: unknown, strings: Readonly<Record<string, string>>): Parsed {
  const record = (content ?? {}) as Record<string, unknown>
  const rawNodes = Array.isArray(record['nodes']) ? record['nodes'] : []
  const rawEdges = Array.isArray(record['edges']) ? record['edges'] : []
  const rawKind = record['layout']

  const nodes = rawNodes.flatMap((entry: unknown): DiagramNode[] => {
    if (typeof entry !== 'object' || entry === null) return []
    const node = entry as Record<string, unknown>
    const id = typeof node['id'] === 'string' ? node['id'] : undefined
    if (id === undefined) return []
    const rawLabel = node['label']
    const label = typeof rawLabel === 'string' ? (strings[rawLabel] ?? rawLabel) : id
    const shape =
      typeof node['shape'] === 'string' && (SHAPES as readonly string[]).includes(node['shape'])
        ? (node['shape'] as NodeShape)
        : 'box'
    return [{ id, label, shape }]
  })

  const edges = rawEdges.flatMap((entry: unknown): DiagramEdge[] => {
    if (typeof entry !== 'object' || entry === null) return []
    const edge = entry as Record<string, unknown>
    const from = typeof edge['from'] === 'string' ? edge['from'] : undefined
    const to = typeof edge?.['to'] === 'string' ? edge['to'] : undefined
    if (from === undefined || to === undefined) return []
    const rawLabel = edge['label']
    const label = typeof rawLabel === 'string' ? (strings[rawLabel] ?? rawLabel) : undefined
    return [{ from, to, ...(label === undefined ? {} : { label }) }]
  })

  return {
    nodes,
    edges,
    kind:
      typeof rawKind === 'string' && (KINDS as readonly string[]).includes(rawKind)
        ? (rawKind as LayoutKind)
        : 'flow',
  }
}

/** Node boxes, sized to the diagram's own rect rather than to fixed pixels. */
function place(parsed: Parsed, rect: Rect): Map<string, Rect> {
  const count = Math.max(1, parsed.nodes.length)
  const boxes = new Map<string, Rect>()

  if (parsed.kind === 'cycle') {
    const radius = Math.min(rect.width, rect.height) * 0.32
    const w = Math.min(rect.width * 0.28, radius * 1.1)
    const h = w * 0.5
    parsed.nodes.forEach((node, i) => {
      const angle = -Math.PI / 2 + (i / count) * Math.PI * 2
      boxes.set(node.id, {
        x: rect.x + rect.width / 2 + Math.cos(angle) * radius - w / 2,
        y: rect.y + rect.height / 2 + Math.sin(angle) * radius - h / 2,
        width: w,
        height: h,
      })
    })
    return boxes
  }

  if (parsed.kind === 'grid') {
    const columns = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / columns)
    const cellW = rect.width / columns
    const cellH = rect.height / rows
    parsed.nodes.forEach((node, i) => {
      const col = i % columns
      const row = Math.floor(i / columns)
      boxes.set(node.id, {
        x: rect.x + col * cellW + cellW * 0.1,
        y: rect.y + row * cellH + cellH * 0.15,
        width: cellW * 0.8,
        height: cellH * 0.7,
      })
    })
    return boxes
  }

  // Flow and tree lay out along the long axis, which keeps a chain readable in either
  // aspect without the author choosing a direction per aspect.
  const horizontal = rect.width >= rect.height
  const w = horizontal ? (rect.width / count) * 0.78 : rect.width * 0.62
  const h = horizontal ? rect.height * 0.34 : (rect.height / count) * 0.62

  parsed.nodes.forEach((node, i) => {
    const along = count === 1 ? 0.5 : i / (count - 1)
    boxes.set(
      node.id,
      horizontal
        ? {
            x: rect.x + w / 2 + along * (rect.width - w * 2) - w / 2 + w / 2,
            y: rect.y + rect.height / 2 - h / 2,
            width: w,
            height: h,
          }
        : {
            x: rect.x + rect.width / 2 - w / 2,
            y: rect.y + h / 2 + along * (rect.height - h * 2) - h / 2 + h / 2,
            width: w,
            height: h,
          },
    )
  })

  return boxes
}

export function DiagramPainter({ item, strings, canvas }: PainterProps): JSX.Element | null {
  const parsed = parse(item.content, strings)
  if (parsed.nodes.length === 0) return null

  const boxes = place(parsed, item.rect)
  const ink = color(defaultTheme, 'ink')
  const paper = color(defaultTheme, 'paper')
  const weight = Math.min(canvas.width, canvas.height) * 0.004
  const fontSize = Math.min(canvas.width, canvas.height) * 0.03

  // `items` is how much of the diagram has been revealed. Edges appear with the node they
  // arrive at, so a chain builds as a chain rather than as dots then lines.
  const revealed = Number.isFinite(item.items) ? item.items : parsed.nodes.length
  const order = new Map(parsed.nodes.map((node, i) => [node.id, i]))

  return (
    <g>
      {parsed.edges.map((edge, i) => {
        const from = boxes.get(edge.from)
        const to = boxes.get(edge.to)
        if (!from || !to) return null
        if ((order.get(edge.to) ?? 0) >= revealed) return null

        const start = edgePoint(from, centreOf(to))
        const end = edgePoint(to, centreOf(from))
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const head = Math.max(12, weight * 3)

        return (
          <g key={`e${String(i)}`}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x - head * 0.8 * Math.cos(angle)}
              y2={end.y - head * 0.8 * Math.sin(angle)}
              stroke={ink}
              strokeWidth={weight}
              strokeLinecap="round"
            />
            <polygon
              points={[
                `${end.x},${end.y}`,
                `${end.x - head * Math.cos(angle - Math.PI / 7)},${end.y - head * Math.sin(angle - Math.PI / 7)}`,
                `${end.x - head * Math.cos(angle + Math.PI / 7)},${end.y - head * Math.sin(angle + Math.PI / 7)}`,
              ].join(' ')}
              fill={ink}
            />
            {edge.label === undefined ? null : (
              <text
                x={(start.x + end.x) / 2}
                y={(start.y + end.y) / 2 - fontSize * 0.4}
                fontSize={fontSize * 0.7}
                fill={ink}
                textAnchor="middle"
              >
                {edge.label}
              </text>
            )}
          </g>
        )
      })}

      {parsed.nodes.map((node, i) => {
        const box = boxes.get(node.id)
        if (!box || i >= revealed) return null

        return (
          <g key={node.id}>
            <NodeShapeEl shape={node.shape} box={box} stroke={ink} fill={paper} weight={weight} />
            <text
              x={box.x + box.width / 2}
              y={box.y + box.height / 2 + fontSize * 0.35}
              fontSize={fontSize}
              fill={ink}
              textAnchor="middle"
              fontWeight={600}
            >
              {node.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

interface NodeShapeProps {
  readonly shape: NodeShape
  readonly box: Rect
  readonly stroke: string
  readonly fill: string
  readonly weight: number
}

function NodeShapeEl({ shape, box, stroke, fill, weight }: NodeShapeProps): JSX.Element {
  const common = { stroke, strokeWidth: weight, fill }
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  if (shape === 'diamond') {
    return (
      <polygon
        points={`${cx},${box.y} ${box.x + box.width},${cy} ${cx},${box.y + box.height} ${box.x},${cy}`}
        {...common}
      />
    )
  }

  if (shape === 'circle') {
    return <ellipse cx={cx} cy={cy} rx={box.width / 2} ry={box.height / 2} {...common} />
  }

  return (
    <rect
      x={box.x}
      y={box.y}
      width={box.width}
      height={box.height}
      rx={shape === 'pill' ? box.height / 2 : Math.min(box.width, box.height) * 0.16}
      {...common}
    />
  )
}
