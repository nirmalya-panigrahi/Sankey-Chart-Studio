import PptxGenJS from 'pptxgenjs';
import { buildAreaBumpPptxShape } from './areaBumpMath';
import { buildChordGroupPptxShape, buildChordRibbonPptxShape } from './chordMath';
import { stripHash } from './palettes';
import { formatSankeyValue, getSlideCanvasDimensions } from './sankeyMath';
import {
  AreaBumpLayoutResult,
  AspectRatio,
  ChordLayoutResult,
  SankeyLayoutResult,
  SankeyStyleConfig,
} from './types';

const PX_PER_INCH = 72;

function toInches(px: number): number {
  return Number((px / PX_PER_INCH).toFixed(4));
}

function addSlideHeader(
  slide: PptxGenJS.Slide,
  inchesWidth: number,
  style: SankeyStyleConfig
): void {
  if (!style.showHeader) return;

  if (style.title.trim()) {
    slide.addText(style.title.trim(), {
      x: 0.6,
      y: 0.34,
      w: inchesWidth - 1.2,
      h: 0.42,
      fontSize: 21,
      bold: true,
      fontFace: 'Arial',
      color: '0F172A',
      margin: 0,
      valign: 'top',
    });
  }

  if (style.subtitle.trim()) {
    slide.addText(style.subtitle.trim(), {
      x: 0.6,
      y: 0.74,
      w: inchesWidth - 1.2,
      h: 0.28,
      fontSize: 11,
      fontFace: 'Arial',
      color: '64748B',
      margin: 0,
      valign: 'top',
    });
  }
}

function sanitizeFileName(title: string, fallback: string): string {
  const safe = (title || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${safe || fallback}.pptx`;
}

export async function exportSankeyToPptx(
  layout: SankeyLayoutResult,
  aspectRatio: AspectRatio,
  style: SankeyStyleConfig
): Promise<void> {
  if (layout.diagnostic || layout.nodes.length === 0) {
    throw new Error('Cannot export PPTX while diagram data is empty or contains errors.');
  }

  const pptx = new PptxGenJS();
  pptx.layout = aspectRatio === '16:9' ? 'LAYOUT_WIDE' : 'LAYOUT_4x3';
  pptx.author = 'SankeyStudio';
  pptx.title = style.title || 'Sankey Flow Diagram';

  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };

  const { inchesWidth } = getSlideCanvasDimensions(aspectRatio);
  addSlideHeader(slide, inchesWidth, style);

  const ribbonTransparency = Math.max(0, Math.min(95, 100 - style.ribbonOpacity));

  // Curved Ribbons as Native Freeform Shapes (custGeom)
  for (const link of layout.links) {
    const x0 = toInches(link.source.x1);
    const x1 = toInches(link.target.x0);
    const halfW = toInches(link.width / 2);
    const y0 = toInches(link.y0);
    const y1 = toInches(link.y1);

    const y0Top = y0 - halfW;
    const y0Bot = y0 + halfW;
    const y1Top = y1 - halfW;
    const y1Bot = y1 + halfW;
    const midX = (x0 + x1) / 2;

    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0Top, y1Top);
    const maxY = Math.max(y0Bot, y1Bot);

    const boxW = Math.max(maxX - minX, 0.01);
    const boxH = Math.max(maxY - minY, 0.01);

    const lx0 = Number((x0 - minX).toFixed(4));
    const lx1 = Number((x1 - minX).toFixed(4));
    const lMidX = Number((midX - minX).toFixed(4));
    const ly0Top = Number((y0Top - minY).toFixed(4));
    const ly0Bot = Number((y0Bot - minY).toFixed(4));
    const ly1Top = Number((y1Top - minY).toFixed(4));
    const ly1Bot = Number((y1Bot - minY).toFixed(4));

    slide.addShape('custGeom' as PptxGenJS.SHAPE_NAME, {
      x: minX,
      y: minY,
      w: boxW,
      h: boxH,
      fill: {
        color: stripHash(link.color),
        transparency: ribbonTransparency,
      },
      line: { width: 0 },
      points: [
        { x: lx0, y: ly0Top, moveTo: true },
        {
          x: lx1,
          y: ly1Top,
          curve: {
            type: 'cubic',
            x1: lMidX,
            y1: ly0Top,
            x2: lMidX,
            y2: ly1Top,
          },
        },
        { x: lx1, y: ly1Bot },
        {
          x: lx0,
          y: ly0Bot,
          curve: {
            type: 'cubic',
            x1: lMidX,
            y1: ly1Bot,
            x2: lMidX,
            y2: ly0Bot,
          },
        },
        { close: true },
      ],
    });
  }

  // Nodes as Native Rectangles
  for (const node of layout.nodes) {
    const x = toInches(node.x0);
    const y = toInches(node.y0);
    const w = Math.max(toInches(node.x1 - node.x0), 0.04);
    const h = Math.max(toInches(node.y1 - node.y0), 0.04);

    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w,
      h,
      fill: { color: stripHash(node.color) },
      line: { width: 0 },
    });
  }

  // Node Labels as Native Text Boxes
  const labelBoxW = 2.25;
  const labelBoxH = 0.46;
  const labelGap = 0.09;
  const nameFontPt = Math.max(8, Math.min(18, style.fontSize));
  const valueFontPt = Math.max(7.5, nameFontPt - 1.5);

  for (const node of layout.nodes) {
    const nodeX0 = toInches(node.x0);
    const nodeX1 = toInches(node.x1);
    const nodeCenterY = toInches((node.y0 + node.y1) / 2);

    const textRuns: PptxGenJS.TextProps[] = [
      {
        text: node.name,
        options: {
          bold: true,
          fontSize: nameFontPt,
          fontFace: 'Arial',
          color: '0F172A',
          breakLine: style.showValues,
        },
      },
    ];

    if (style.showValues) {
      textRuns.push({
        text: formatSankeyValue(node.value, style.numberFormat, layout.totalRootInflow),
        options: {
          bold: false,
          fontSize: valueFontPt,
          fontFace: 'Arial',
          color: '475569',
        },
      });
    }

    const labelX = node.isRightmost
      ? Math.max(0.08, nodeX0 - labelBoxW - labelGap)
      : Math.min(inchesWidth - labelBoxW - 0.08, nodeX1 + labelGap);

    const labelY = Math.max(0.1, nodeCenterY - labelBoxH / 2);

    slide.addText(textRuns, {
      x: Number(labelX.toFixed(4)),
      y: Number(labelY.toFixed(4)),
      w: labelBoxW,
      h: labelBoxH,
      align: node.isRightmost ? 'right' : 'left',
      valign: 'middle',
      margin: 0,
      wrap: true,
    });
  }

  await pptx.writeFile({ fileName: sanitizeFileName(style.title, 'sankey-diagram') });
}

export async function exportChordToPptx(
  layout: ChordLayoutResult,
  aspectRatio: AspectRatio,
  style: SankeyStyleConfig
): Promise<void> {
  if (layout.diagnostic || layout.groups.length === 0) {
    throw new Error('Cannot export PPTX while diagram data is empty or contains errors.');
  }

  const pptx = new PptxGenJS();
  pptx.layout = aspectRatio === '16:9' ? 'LAYOUT_WIDE' : 'LAYOUT_4x3';
  pptx.author = 'SankeyStudio';
  pptx.title = style.title || 'Chord Flow Diagram';

  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };

  const { inchesWidth } = getSlideCanvasDimensions(aspectRatio);
  addSlideHeader(slide, inchesWidth, style);

  const ribbonTransparency = Math.max(0, Math.min(95, 100 - style.ribbonOpacity));

  // 1. Chord Ribbons as Native custGeom Shapes
  for (const ribbon of layout.ribbons) {
    const geom = buildChordRibbonPptxShape(
      ribbon,
      layout.innerRadius,
      layout.centerX,
      layout.centerY
    );

    slide.addShape('custGeom' as PptxGenJS.SHAPE_NAME, {
      x: geom.x,
      y: geom.y,
      w: geom.w,
      h: geom.h,
      fill: {
        color: stripHash(ribbon.color),
        transparency: ribbonTransparency,
      },
      line: { width: 0 },
      points: geom.points,
    });
  }

  // 2. Outer Group Arcs as Native custGeom Shapes
  for (const group of layout.groups) {
    const geom = buildChordGroupPptxShape(
      group,
      layout.innerRadius,
      layout.outerRadius,
      layout.centerX,
      layout.centerY
    );

    slide.addShape('custGeom' as PptxGenJS.SHAPE_NAME, {
      x: geom.x,
      y: geom.y,
      w: geom.w,
      h: geom.h,
      fill: { color: stripHash(group.color) },
      line: { width: 0 },
      points: geom.points,
    });
  }

  // 3. Radial Labels as Native Text Boxes
  const labelBoxW = 2.2;
  const labelBoxH = 0.44;
  const nameFontPt = Math.max(8, Math.min(18, style.fontSize));
  const valueFontPt = Math.max(7.5, nameFontPt - 1.5);

  for (const group of layout.groups) {
    const lx = toInches(group.labelX);
    const ly = toInches(group.labelY);

    const textRuns: PptxGenJS.TextProps[] = [
      {
        text: group.name,
        options: {
          bold: true,
          fontSize: nameFontPt,
          fontFace: 'Arial',
          color: '0F172A',
          breakLine: style.showValues,
        },
      },
    ];

    if (style.showValues) {
      textRuns.push({
        text: formatSankeyValue(group.value, style.numberFormat, layout.totalFlow),
        options: {
          bold: false,
          fontSize: valueFontPt,
          fontFace: 'Arial',
          color: '475569',
        },
      });
    }

    const boxX = group.isLeftSide
      ? Math.max(0.08, lx - labelBoxW)
      : Math.min(inchesWidth - labelBoxW - 0.08, lx);
    const boxY = Math.max(0.1, ly - labelBoxH / 2);

    slide.addText(textRuns, {
      x: Number(boxX.toFixed(4)),
      y: Number(boxY.toFixed(4)),
      w: labelBoxW,
      h: labelBoxH,
      align: group.isLeftSide ? 'right' : 'left',
      valign: 'middle',
      margin: 0,
      wrap: true,
    });
  }

  await pptx.writeFile({ fileName: sanitizeFileName(style.title, 'chord-diagram') });
}

export async function exportAreaBumpToPptx(
  layout: AreaBumpLayoutResult,
  aspectRatio: AspectRatio,
  style: SankeyStyleConfig
): Promise<void> {
  if (layout.diagnostic || layout.series.length === 0) {
    throw new Error('Cannot export PPTX while diagram data is empty or contains errors.');
  }

  const pptx = new PptxGenJS();
  pptx.layout = aspectRatio === '16:9' ? 'LAYOUT_WIDE' : 'LAYOUT_4x3';
  pptx.author = 'SankeyStudio';
  pptx.title = style.title || 'Area Bump Chart';

  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };

  const { inchesWidth } = getSlideCanvasDimensions(aspectRatio);
  addSlideHeader(slide, inchesWidth, style);

  const topIn = toInches(layout.plotTop - 6);
  const bottomIn = toInches(layout.plotBottom + 6);
  const lineH = Math.max(0.1, Number((bottomIn - topIn).toFixed(4)));

  // 1. Vertical Period Guide Lines & X-Axis Labels
  for (const period of layout.periods) {
    const px = toInches(period.x);

    slide.addShape(pptx.ShapeType.line, {
      x: px,
      y: topIn,
      w: 0,
      h: lineH,
      line: { color: 'E2E8F0', width: 0.75 },
    });

    slide.addText(period.name, {
      x: Number(Math.max(0.05, px - 0.5).toFixed(4)),
      y: Number((bottomIn + 0.06).toFixed(4)),
      w: 1.0,
      h: 0.25,
      align: 'center',
      fontSize: 10,
      bold: true,
      fontFace: 'Arial',
      color: '475569',
      margin: 0,
    });
  }

  // 2. Series Rank-Stream Ribbons as Native custGeom Shapes
  const ribbonTransparency = Math.max(0, Math.min(95, 100 - style.ribbonOpacity));

  for (const s of layout.series) {
    const geom = buildAreaBumpPptxShape(s);
    if (!geom) continue;

    slide.addShape('custGeom' as PptxGenJS.SHAPE_NAME, {
      x: geom.x,
      y: geom.y,
      w: geom.w,
      h: geom.h,
      fill: {
        color: stripHash(s.color),
        transparency: ribbonTransparency,
      },
      line: { color: 'FFFFFF', width: 1.0 },
      points: geom.points,
    });
  }

  // 3. Left Start Labels & Right End Labels as Native Text Boxes
  const nameFontPt = Math.max(8, Math.min(18, style.fontSize));
  const valueFontPt = Math.max(7.5, nameFontPt - 1.5);
  const leftLabelW = 1.65;
  const rightLabelW = 2.0;
  const labelBoxH = 0.44;

  for (const s of layout.series) {
    const firstPt = s.points[s.firstActiveIndex];
    const lastPt = s.points[s.lastActiveIndex];

    if (style.bumpShowLeftLabels && firstPt) {
      const lx = Math.max(0.08, toInches(firstPt.x) - leftLabelW - 0.12);
      const ly = Math.max(0.1, toInches(firstPt.yMid) - labelBoxH / 2);

      slide.addText(
        [
          {
            text: `#${s.firstRank} `,
            options: {
              bold: true,
              fontSize: Math.max(7.5, nameFontPt - 1),
              fontFace: 'Arial',
              color: '64748B',
            },
          },
          {
            text: s.name,
            options: {
              bold: true,
              fontSize: nameFontPt,
              fontFace: 'Arial',
              color: '0F172A',
            },
          },
        ],
        {
          x: Number(lx.toFixed(4)),
          y: Number(ly.toFixed(4)),
          w: leftLabelW,
          h: labelBoxH,
          align: 'right',
          valign: 'middle',
          margin: 0,
          wrap: true,
        }
      );
    }

    if (lastPt) {
      const rx = Math.min(inchesWidth - rightLabelW - 0.08, toInches(lastPt.x) + 0.12);
      const ry = Math.max(0.1, toInches(lastPt.yMid) - labelBoxH / 2);

      const rightRuns: PptxGenJS.TextProps[] = [
        {
          text: `#${s.latestRank} `,
          options: {
            bold: true,
            fontSize: Math.max(7.5, nameFontPt - 1),
            fontFace: 'Arial',
            color: '64748B',
          },
        },
        {
          text: s.name,
          options: {
            bold: true,
            fontSize: nameFontPt,
            fontFace: 'Arial',
            color: '0F172A',
            breakLine: style.showValues,
          },
        },
      ];

      if (style.showValues) {
        rightRuns.push({
          text: formatSankeyValue(s.latestValue, style.numberFormat, layout.totalLatestFlow),
          options: {
            bold: false,
            fontSize: valueFontPt,
            fontFace: 'Arial',
            color: '475569',
          },
        });
      }

      slide.addText(rightRuns, {
        x: Number(rx.toFixed(4)),
        y: Number(ry.toFixed(4)),
        w: rightLabelW,
        h: labelBoxH,
        align: 'left',
        valign: 'middle',
        margin: 0,
        wrap: true,
      });
    }
  }

  await pptx.writeFile({ fileName: sanitizeFileName(style.title, 'area-bump-chart') });
}

