import type PptxGenJS from 'pptxgenjs';
import { getSlideCanvasDimensions } from './sankeyMath';
import {
  AreaBumpLayoutResult,
  AspectRatio,
  ComputedAreaBumpPoint,
  ComputedAreaBumpPeriod,
  ComputedAreaBumpSeries,
  DataDiagnostic,
  FlowRow,
  SankeyStyleConfig,
} from './types';

const PX_PER_INCH = 72;

function toInches(px: number): number {
  return px / PX_PER_INCH;
}

export function validateAreaBumpData(rows: FlowRow[]): DataDiagnostic | null {
  if (rows.length === 0) {
    return {
      type: 'empty',
      message: 'Add at least one row with a Series, Period, and positive Value.',
      offendingRowIds: [],
    };
  }

  const validRows = rows.filter(
    (r) => r.source.trim() && r.target.trim() && Number.isFinite(r.value) && r.value > 0
  );

  if (validRows.length === 0) {
    return {
      type: 'invalid-value',
      message: 'Every row needs a Series, Period, and a numeric Value greater than zero.',
      offendingRowIds: rows.map((r) => r.id),
    };
  }

  return null;
}

function smartSortPeriods(periods: string[]): string[] {
  // If all periods look like numbers/years (e.g. "2022", "2023"), sort numerically ascending
  if (periods.every((p) => /^-?\d+(\.\d+)?$/.test(p))) {
    return [...periods].sort((a, b) => Number(a) - Number(b));
  }
  // If all periods match "Q1 2024" or "2024 Q1", sort chronologically
  const qMatch = (s: string): number | null => {
    const m1 = s.match(/^Q([1-4])\s*[-/]?\s*(\d{2,4})$/i);
    if (m1) {
      const yr = m1[2].length === 2 ? 2000 + Number(m1[2]) : Number(m1[2]);
      return yr * 10 + Number(m1[1]);
    }
    const m2 = s.match(/^(\d{2,4})\s*[-/]?\s*Q([1-4])$/i);
    if (m2) {
      const yr = m2[1].length === 2 ? 2000 + Number(m2[1]) : Number(m2[1]);
      return yr * 10 + Number(m2[2]);
    }
    return null;
  };
  if (periods.every((p) => qMatch(p) !== null)) {
    return [...periods].sort((a, b) => (qMatch(a) ?? 0) - (qMatch(b) ?? 0));
  }
  return periods;
}

export function computeAreaBumpLayout(
  rows: FlowRow[],
  aspectRatio: AspectRatio,
  style: SankeyStyleConfig,
  paletteColors: string[],
  nodeColorOverrides: Record<string, string>
): AreaBumpLayoutResult {
  const { width: canvasWidth, height: canvasHeight } = getSlideCanvasDimensions(aspectRatio);
  const diagnostic = validateAreaBumpData(rows);

  const plotLeft = style.bumpShowLeftLabels ? 128 : 48;
  const plotRight = canvasWidth - 150;
  const plotTop = style.showHeader ? 98 : 42;
  const plotBottom = canvasHeight - 48;

  if (diagnostic) {
    return {
      series: [],
      periods: [],
      plotTop,
      plotBottom,
      plotLeft,
      plotRight,
      totalLatestFlow: 0,
      canvasWidth,
      canvasHeight,
      diagnostic,
    };
  }

  const validRows = rows.filter(
    (r) => r.source.trim() && r.target.trim() && Number.isFinite(r.value) && r.value > 0
  );

  // Collect unique series & periods in first-seen order
  const seriesOrder: string[] = [];
  const seriesSet = new Set<string>();
  const periodOrderRaw: string[] = [];
  const periodSet = new Set<string>();

  // Map (series -> period -> accumulated value)
  const matrix = new Map<string, Map<string, number>>();

  for (const r of validRows) {
    const ser = r.source.trim();
    const per = r.target.trim();

    if (!seriesSet.has(ser)) {
      seriesSet.add(ser);
      seriesOrder.push(ser);
    }
    if (!periodSet.has(per)) {
      periodSet.add(per);
      periodOrderRaw.push(per);
    }

    if (!matrix.has(ser)) matrix.set(ser, new Map());
    const perMap = matrix.get(ser)!;
    perMap.set(per, (perMap.get(per) ?? 0) + r.value);
  }

  const periodNames = smartSortPeriods(periodOrderRaw);
  const numPeriods = periodNames.length;
  const plotSpanX = Math.max(40, plotRight - plotLeft);

  const periods: ComputedAreaBumpPeriod[] = periodNames.map((name, idx) => {
    const x =
      numPeriods === 1
        ? plotLeft + plotSpanX / 2
        : plotLeft + (idx / (numPeriods - 1)) * plotSpanX;
    let totalValue = 0;
    for (const ser of seriesOrder) {
      totalValue += matrix.get(ser)?.get(name) ?? 0;
    }
    return { name, index: idx, x, totalValue };
  });

  // Determine per-period rankings and global scale
  const availH = Math.max(80, plotBottom - plotTop);
  const gapPx = Math.max(0, style.bumpSpacing);
  const periodRankedSeries = new Map<string, string[]>();
  let maxColumnRawScaleNeeded = 0;

  for (const period of periods) {
    const active = seriesOrder
      .map((ser, sIdx) => ({
        name: ser,
        sIdx,
        val: matrix.get(ser)?.get(period.name) ?? 0,
      }))
      .filter((item) => item.val > 0)
      .sort((a, b) => {
        if (b.val !== a.val) return b.val - a.val;
        return a.sIdx - b.sIdx;
      });

    periodRankedSeries.set(
      period.name,
      active.map((a) => a.name)
    );

    const totalGaps = Math.max(0, active.length - 1) * gapPx;
    const usableH = Math.max(24, availH - totalGaps);
    if (period.totalValue > 0) {
      const neededRatio = period.totalValue / usableH;
      if (neededRatio > maxColumnRawScaleNeeded) {
        maxColumnRawScaleNeeded = neededRatio;
      }
    }
  }

  // Compute coordinates per series at every period
  const pointsBySeries = new Map<string, ComputedAreaBumpPoint[]>();
  for (const ser of seriesOrder) {
    pointsBySeries.set(ser, []);
  }

  for (const period of periods) {
    const ranked = periodRankedSeries.get(period.name) || [];
    const totalGaps = Math.max(0, ranked.length - 1) * gapPx;
    const usableH = Math.max(24, availH - totalGaps);

    const pxPerUnit = style.bumpNormalize
      ? period.totalValue > 0
        ? usableH / period.totalValue
        : 0
      : maxColumnRawScaleNeeded > 0
      ? 1 / maxColumnRawScaleNeeded
      : 0;

    // Total stacked height for this period column
    let columnHeight = totalGaps;
    const heights = ranked.map((ser) => {
      const val = matrix.get(ser)?.get(period.name) ?? 0;
      const h = Math.max(3, val * pxPerUnit);
      columnHeight += h;
      return h;
    });

    // Vertically center the rank stream within [plotTop, plotBottom]
    let cursorY = plotTop + (availH - columnHeight) / 2;

    const rankBySeries = new Map<string, { rank: number; yTop: number; yBot: number; val: number }>();
    ranked.forEach((ser, rIdx) => {
      const h = heights[rIdx];
      const val = matrix.get(ser)?.get(period.name) ?? 0;
      rankBySeries.set(ser, {
        rank: rIdx + 1,
        yTop: cursorY,
        yBot: cursorY + h,
        val,
      });
      cursorY += h + gapPx;
    });

    const bottomPinchY = plotTop + (availH + columnHeight) / 2;

    for (const ser of seriesOrder) {
      const entry = rankBySeries.get(ser);
      if (entry) {
        pointsBySeries.get(ser)!.push({
          period: period.name,
          periodIndex: period.index,
          x: period.x,
          yTop: entry.yTop,
          yBot: entry.yBot,
          yMid: (entry.yTop + entry.yBot) / 2,
          value: entry.val,
          share: period.totalValue > 0 ? entry.val / period.totalValue : 0,
          rank: entry.rank,
        });
      } else {
        pointsBySeries.get(ser)!.push({
          period: period.name,
          periodIndex: period.index,
          x: period.x,
          yTop: bottomPinchY,
          yBot: bottomPinchY,
          yMid: bottomPinchY,
          value: 0,
          share: 0,
          rank: null,
        });
      }
    }
  }

  const safePalette = paletteColors.length > 0 ? paletteColors : ['#003f5c', '#2f4b7c', '#665191'];

  // Assign deterministic colors based on initial order or Rank 1 first
  const computedSeries: ComputedAreaBumpSeries[] = seriesOrder.map((name, idx) => {
    const pts = pointsBySeries.get(name)!;
    const activeIndices = pts
      .map((p, i) => (p.value > 0 ? i : -1))
      .filter((i) => i >= 0);

    const firstActiveIndex = activeIndices[0] ?? 0;
    const lastActiveIndex = activeIndices[activeIndices.length - 1] ?? pts.length - 1;
    const firstPt = pts[firstActiveIndex];
    const lastPt = pts[lastActiveIndex];

    const rankedPts = pts.filter((p) => p.rank !== null);
    const avgRank =
      rankedPts.length > 0
        ? rankedPts.reduce((sum, p) => sum + (p.rank ?? 99), 0) / rankedPts.length
        : 99;

    const color = nodeColorOverrides[name] || safePalette[idx % safePalette.length];

    return {
      index: idx,
      name,
      color,
      points: pts,
      firstActiveIndex,
      lastActiveIndex,
      latestValue: lastPt?.value ?? 0,
      latestShare: lastPt?.share ?? 0,
      latestRank: lastPt?.rank ?? idx + 1,
      firstRank: firstPt?.rank ?? idx + 1,
      avgRank,
    };
  });

  // Sort draw order so higher-ranked ribbons sit cleanly in front at crossings
  const sortedForDraw = [...computedSeries].sort((a, b) => b.avgRank - a.avgRank);
  const lastPeriod = periods[periods.length - 1];

  return {
    series: sortedForDraw,
    periods,
    plotTop,
    plotBottom,
    plotLeft,
    plotRight,
    totalLatestFlow: lastPeriod?.totalValue ?? 0,
    canvasWidth,
    canvasHeight,
    diagnostic: null,
  };
}

export function buildAreaBumpSvgPath(series: ComputedAreaBumpSeries): string {
  const pts = series.points.slice(series.firstActiveIndex, series.lastActiveIndex + 1);
  if (pts.length === 0) return '';

  if (pts.length === 1) {
    const p = pts[0];
    const halfW = 10;
    return [
      `M ${(p.x - halfW).toFixed(2)},${p.yTop.toFixed(2)}`,
      `L ${(p.x + halfW).toFixed(2)},${p.yTop.toFixed(2)}`,
      `L ${(p.x + halfW).toFixed(2)},${p.yBot.toFixed(2)}`,
      `L ${(p.x - halfW).toFixed(2)},${p.yBot.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  const parts: string[] = [`M ${pts[0].x.toFixed(2)},${pts[0].yTop.toFixed(2)}`];

  // Top edge left-to-right
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = (p0.x + p1.x) / 2;
    parts.push(
      `C ${midX.toFixed(2)},${p0.yTop.toFixed(2)} ${midX.toFixed(2)},${p1.yTop.toFixed(2)} ${p1.x.toFixed(2)},${p1.yTop.toFixed(2)}`
    );
  }

  // Right vertical edge
  const last = pts[pts.length - 1];
  parts.push(`L ${last.x.toFixed(2)},${last.yBot.toFixed(2)}`);

  // Bottom edge right-to-left
  for (let i = pts.length - 1; i > 0; i--) {
    const pCurr = pts[i];
    const pPrev = pts[i - 1];
    const midX = (pCurr.x + pPrev.x) / 2;
    parts.push(
      `C ${midX.toFixed(2)},${pCurr.yBot.toFixed(2)} ${midX.toFixed(2)},${pPrev.yBot.toFixed(2)} ${pPrev.x.toFixed(2)},${pPrev.yBot.toFixed(2)}`
    );
  }

  parts.push('Z');
  return parts.join(' ');
}

type PptxPoint = NonNullable<PptxGenJS.ShapeProps['points']>[number];

export interface AreaBumpPptxShape {
  x: number;
  y: number;
  w: number;
  h: number;
  points: PptxPoint[];
}

export function buildAreaBumpPptxShape(series: ComputedAreaBumpSeries): AreaBumpPptxShape | null {
  const pts = series.points.slice(series.firstActiveIndex, series.lastActiveIndex + 1);
  if (pts.length === 0) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const singleHalfW = pts.length === 1 ? 10 : 0;

  for (const p of pts) {
    const ixLeft = toInches(p.x - singleHalfW);
    const ixRight = toInches(p.x + singleHalfW);
    const iyTop = toInches(p.yTop);
    const iyBot = toInches(p.yBot);
    if (ixLeft < minX) minX = ixLeft;
    if (ixRight > maxX) maxX = ixRight;
    if (iyTop < minY) minY = iyTop;
    if (iyBot > maxY) maxY = iyBot;
  }

  const w = Math.max(maxX - minX, 0.01);
  const h = Math.max(maxY - minY, 0.01);
  const lx = (px: number) => Number((toInches(px) - minX).toFixed(4));
  const ly = (py: number) => Number((toInches(py) - minY).toFixed(4));

  const points: PptxPoint[] = [];

  if (pts.length === 1) {
    const p = pts[0];
    points.push({ x: lx(p.x - singleHalfW), y: ly(p.yTop), moveTo: true });
    points.push({ x: lx(p.x + singleHalfW), y: ly(p.yTop) });
    points.push({ x: lx(p.x + singleHalfW), y: ly(p.yBot) });
    points.push({ x: lx(p.x - singleHalfW), y: ly(p.yBot) });
    points.push({ close: true });
  } else {
    points.push({ x: lx(pts[0].x), y: ly(pts[0].yTop), moveTo: true });

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const midX = (p0.x + p1.x) / 2;
      points.push({
        x: lx(p1.x),
        y: ly(p1.yTop),
        curve: {
          type: 'cubic',
          x1: lx(midX),
          y1: ly(p0.yTop),
          x2: lx(midX),
          y2: ly(p1.yTop),
        },
      });
    }

    const last = pts[pts.length - 1];
    points.push({ x: lx(last.x), y: ly(last.yBot) });

    for (let i = pts.length - 1; i > 0; i--) {
      const pCurr = pts[i];
      const pPrev = pts[i - 1];
      const midX = (pCurr.x + pPrev.x) / 2;
      points.push({
        x: lx(pPrev.x),
        y: ly(pPrev.yBot),
        curve: {
          type: 'cubic',
          x1: lx(midX),
          y1: ly(pCurr.yBot),
          x2: lx(midX),
          y2: ly(pPrev.yBot),
        },
      });
    }

    points.push({ close: true });
  }

  return {
    x: Number(minX.toFixed(4)),
    y: Number(minY.toFixed(4)),
    w: Number(w.toFixed(4)),
    h: Number(h.toFixed(4)),
    points,
  };
}
