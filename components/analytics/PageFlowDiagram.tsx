import type React from 'react';

export interface FlowEdge {
  from: string;
  to: string;
  count: number;
}

interface LayoutNode {
  label: string;
  total: number;
  y0: number;
  y1: number;
}

interface LayoutRibbon {
  edge: FlowEdge;
  leftY0: number;
  leftY1: number;
  rightY0: number;
  rightY1: number;
}

const WIDTH = 720;
const HEIGHT = 400;
const NODE_WIDTH = 12;
const NODE_GAP = 6;
const MAX_NODES_PER_SIDE = 8;
const LEFT_X = NODE_WIDTH;
const RIGHT_X = WIDTH - NODE_WIDTH;

function topNodesByTotal(edges: FlowEdge[], side: 'from' | 'to'): string[] {
  const totals = new Map<string, number>();
  for (const edge of edges) {
    const key = edge[side];
    totals.set(key, (totals.get(key) ?? 0) + edge.count);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_NODES_PER_SIDE)
    .map(([label]) => label);
}

function layoutColumn(labels: string[], totalsByLabel: Map<string, number>, grandTotal: number): LayoutNode[] {
  const availableHeight = HEIGHT - NODE_GAP * (labels.length - 1);
  let y = 0;
  return labels.map((label) => {
    const total = totalsByLabel.get(label) ?? 0;
    const height = grandTotal > 0 ? Math.max(4, (total / grandTotal) * availableHeight) : 0;
    const node = { label, total, y0: y, y1: y + height };
    y += height + NODE_GAP;
    return node;
  });
}

function buildLayout(edges: FlowEdge[]): { left: LayoutNode[]; right: LayoutNode[]; ribbons: LayoutRibbon[] } {
  const fromLabels = topNodesByTotal(edges, 'from');
  const toLabels = topNodesByTotal(edges, 'to');
  const visibleEdges = edges.filter((e) => fromLabels.includes(e.from) && toLabels.includes(e.to));

  const fromTotals = new Map<string, number>();
  const toTotals = new Map<string, number>();
  for (const edge of visibleEdges) {
    fromTotals.set(edge.from, (fromTotals.get(edge.from) ?? 0) + edge.count);
    toTotals.set(edge.to, (toTotals.get(edge.to) ?? 0) + edge.count);
  }

  const grandTotal = visibleEdges.reduce((sum, e) => sum + e.count, 0);
  const left = layoutColumn(
    fromLabels.filter((l) => fromTotals.has(l)),
    fromTotals,
    grandTotal,
  );
  const right = layoutColumn(
    toLabels.filter((l) => toTotals.has(l)),
    toTotals,
    grandTotal,
  );

  const leftCursor = new Map(left.map((n) => [n.label, n.y0]));
  const rightCursor = new Map(right.map((n) => [n.label, n.y0]));
  const leftByLabel = new Map(left.map((n) => [n.label, n]));
  const rightByLabel = new Map(right.map((n) => [n.label, n]));

  const ribbons: LayoutRibbon[] = [];
  for (const edge of visibleEdges) {
    const leftNode = leftByLabel.get(edge.from);
    const rightNode = rightByLabel.get(edge.to);
    const fromTotal = fromTotals.get(edge.from);
    const toTotal = toTotals.get(edge.to);
    const leftY0 = leftCursor.get(edge.from);
    const rightY0 = rightCursor.get(edge.to);
    if (!leftNode || !rightNode || !fromTotal || !toTotal || leftY0 === undefined || rightY0 === undefined) continue;

    const leftHeight = grandTotal > 0 ? (edge.count / fromTotal) * (leftNode.y1 - leftNode.y0) : 0;
    const rightHeight = grandTotal > 0 ? (edge.count / toTotal) * (rightNode.y1 - rightNode.y0) : 0;

    leftCursor.set(edge.from, leftY0 + leftHeight);
    rightCursor.set(edge.to, rightY0 + rightHeight);

    ribbons.push({ edge, leftY0, leftY1: leftY0 + leftHeight, rightY0, rightY1: rightY0 + rightHeight });
  }

  return { left, right, ribbons };
}

function ribbonPath(ribbon: LayoutRibbon): string {
  const midX = WIDTH / 2;
  const { leftY0, leftY1, rightY0, rightY1 } = ribbon;
  return `M ${LEFT_X},${leftY0}
    C ${midX},${leftY0} ${midX},${rightY0} ${RIGHT_X},${rightY0}
    L ${RIGHT_X},${rightY1}
    C ${midX},${rightY1} ${midX},${leftY1} ${LEFT_X},${leftY1}
    Z`;
}

function truncateLabel(label: string, max = 24): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export const PageFlowDiagram: React.FC<{ edges: FlowEdge[] }> = ({ edges }) => {
  if (edges.length === 0) {
    return <p className="text-sm text-muted-foreground py-12 text-center">Not enough session data yet.</p>;
  }

  const { left, right, ribbons } = buildLayout(edges);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT + 40}`}
        className="w-full min-w-[520px]"
        role="img"
        aria-label="Page flow diagram"
      >
        <g transform="translate(0, 20)">
          {ribbons.map((ribbon) => (
            <path
              key={`${ribbon.edge.from}->${ribbon.edge.to}`}
              d={ribbonPath(ribbon)}
              className="fill-accent/20 hover:fill-accent/35 transition-colors duration-150"
            >
              <title>
                {ribbon.edge.from} → {ribbon.edge.to} ({ribbon.edge.count.toLocaleString()})
              </title>
            </path>
          ))}

          {left.map((node) => (
            <g key={`left:${node.label}`}>
              <rect
                x={0}
                y={node.y0}
                width={NODE_WIDTH}
                height={Math.max(1, node.y1 - node.y0)}
                className="fill-foreground/70"
              />
              <text
                x={NODE_WIDTH + 6}
                y={(node.y0 + node.y1) / 2}
                dominantBaseline="middle"
                className="fill-foreground text-[10px]"
              >
                {truncateLabel(node.label)}
              </text>
            </g>
          ))}

          {right.map((node) => (
            <g key={`right:${node.label}`}>
              <rect
                x={RIGHT_X}
                y={node.y0}
                width={NODE_WIDTH}
                height={Math.max(1, node.y1 - node.y0)}
                className="fill-foreground/70"
              />
              <text
                x={RIGHT_X - 6}
                y={(node.y0 + node.y1) / 2}
                dominantBaseline="middle"
                textAnchor="end"
                className="fill-foreground text-[10px]"
              >
                {truncateLabel(node.label)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};
