import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  CircleDot,
  Download,
  FileCode2,
  GitMerge,
  Image as ImageIcon,
  Layers,
  Palette as PaletteIcon,
  Redo2,
  SlidersHorizontal,
  Table2,
  TrendingUp,
  Undo2,
} from 'lucide-react';
import { computeAreaBumpLayout } from './areaBumpMath';
import { computeChordLayout } from './chordMath';
import { BulkPasteModal } from './components/BulkPasteModal';
import { DataInputTab } from './components/DataInputTab';
import { LayoutStylingTab } from './components/LayoutStylingTab';
import { PalettesTab } from './components/PalettesTab';
import { SlidePreviewCanvas } from './components/SlidePreviewCanvas';
import { exportSankeyToPng, exportSankeyToSvg } from './exportUtils';
import { EXECUTIVE_PALETTES, SAMPLE_DATASETS } from './palettes';
import { exportAreaBumpToPptx, exportChordToPptx, exportSankeyToPptx } from './pptxExporter';
import { computeSankeyLayout } from './sankeyMath';
import { AspectRatio, ChartType, FlowRow, SankeyDocumentState, SankeyStyleConfig } from './types';
import { useHistoryManager } from './useHistoryManager';

type SidebarTab = 'data' | 'palettes' | 'layout';

function createRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function hydrateRows(rows: Array<Omit<FlowRow, 'id'>>): FlowRow[] {
  return rows.map((r) => ({
    ...r,
    id: createRowId(),
  }));
}

function createInitialDocumentState(): SankeyDocumentState {
  const initialSample = SAMPLE_DATASETS[0];
  return {
    chartType: 'sankey',
    rows: hydrateRows(initialSample.rows),
    aspectRatio: '16:9',
    activePaletteId: EXECUTIVE_PALETTES[0].id,
    customPaletteColors: {},
    nodeColorOverrides: {},
    style: {
      nodeWidth: 18,
      nodePadding: 20,
      ribbonOpacity: 45,
      fontSize: 12,
      linkColorMode: 'source',
      nodeAlign: 'justify',
      showValues: true,
      numberFormat: initialSample.numberFormat,
      showHeader: true,
      title: initialSample.title,
      subtitle: initialSample.subtitle,
      chordRingThickness: 18,
      chordPadAngle: 4,
      chordDirected: true,
      bumpSpacing: 10,
      bumpNormalize: false,
      bumpShowLeftLabels: true,
    },
  };
}

export default function App() {
  const {
    state: doc,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  } = useHistoryManager<SankeyDocumentState>(createInitialDocumentState);

  const {
    chartType,
    rows,
    aspectRatio,
    activePaletteId,
    customPaletteColors,
    nodeColorOverrides,
    style,
  } = doc;

  const [activeTab, setActiveTab] = useState<SidebarTab>('data');
  const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const activePalette = useMemo(
    () => EXECUTIVE_PALETTES.find((p) => p.id === activePaletteId) || EXECUTIVE_PALETTES[0],
    [activePaletteId]
  );

  const activeColors = useMemo(
    () => customPaletteColors[activePalette.id] || activePalette.colors,
    [customPaletteColors, activePalette]
  );

  const sankeyLayout = useMemo(
    () => computeSankeyLayout(rows, aspectRatio, style, activeColors, nodeColorOverrides),
    [rows, aspectRatio, style, activeColors, nodeColorOverrides]
  );

  const chordLayout = useMemo(
    () => computeChordLayout(rows, aspectRatio, style, activeColors, nodeColorOverrides),
    [rows, aspectRatio, style, activeColors, nodeColorOverrides]
  );

  const areaBumpLayout = useMemo(
    () => computeAreaBumpLayout(rows, aspectRatio, style, activeColors, nodeColorOverrides),
    [rows, aspectRatio, style, activeColors, nodeColorOverrides]
  );

  const activeDiagnostic =
    chartType === 'sankey'
      ? sankeyLayout.diagnostic
      : chartType === 'chord'
      ? chordLayout.diagnostic
      : areaBumpLayout.diagnostic;

  const activeNodeEntries =
    chartType === 'sankey'
      ? sankeyLayout.nodes
      : chartType === 'chord'
      ? chordLayout.groups
      : areaBumpLayout.series;

  const activeTotalFlow =
    chartType === 'sankey'
      ? sankeyLayout.totalRootInflow
      : chartType === 'chord'
      ? chordLayout.totalFlow
      : areaBumpLayout.totalLatestFlow;

  const flashStatus = useCallback((msg: string) => {
    setExportStatus(msg);
    window.setTimeout(() => {
      setExportStatus((current) => (current === msg ? null : current));
    }, 3200);
  }, []);

  const handleSetChartType = useCallback(
    (nextType: ChartType) => {
      const labelMap: Record<ChartType, string> = {
        sankey: 'Sankey',
        chord: 'Chord',
        'area-bump': 'Area Bump',
      };
      commit(
        (prev) => (prev.chartType === nextType ? prev : { ...prev, chartType: nextType }),
        { label: `Switch to ${labelMap[nextType]} chart` }
      );
    },
    [commit]
  );

  const handleSetAspectRatio = useCallback(
    (nextRatio: AspectRatio) => {
      commit(
        (prev) => (prev.aspectRatio === nextRatio ? prev : { ...prev, aspectRatio: nextRatio }),
        { label: `Switch to ${nextRatio}` }
      );
    },
    [commit]
  );

  const handleUpdateRow = useCallback(
    (id: string, patch: Partial<Omit<FlowRow, 'id'>>) => {
      const fields = Object.keys(patch).sort().join(',');
      commit(
        (prev) => ({
          ...prev,
          rows: prev.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }),
        {
          label: 'Edit flow row',
          groupKey: `row:${id}:${fields}`,
        }
      );
    },
    [commit]
  );

  const handleDeleteRow = useCallback(
    (id: string) => {
      commit(
        (prev) => ({
          ...prev,
          rows: prev.rows.filter((r) => r.id !== id),
        }),
        { label: 'Delete flow row' }
      );
    },
    [commit]
  );

  const handleAddRow = useCallback(() => {
    commit(
      (prev) => ({
        ...prev,
        rows: [
          ...prev.rows,
          {
            id: createRowId(),
            source: '',
            target: '',
            value: 1000,
          },
        ],
      }),
      { label: 'Add flow row' }
    );
  }, [commit]);

  const handleApplyBulkRows = useCallback(
    (incoming: Array<Omit<FlowRow, 'id'>>, mode: 'replace' | 'append') => {
      const hydrated = hydrateRows(incoming);
      if (mode === 'replace') {
        setSelectedNodeName(null);
      }
      commit(
        (prev) =>
          mode === 'replace'
            ? {
                ...prev,
                rows: hydrated,
                nodeColorOverrides: {},
              }
            : {
                ...prev,
                rows: [...prev.rows, ...hydrated],
              },
        { label: mode === 'replace' ? 'Replace flows via CSV' : 'Append flows via CSV' }
      );
    },
    [commit]
  );

  const handleLoadSample = useCallback(
    (sampleId: string) => {
      const found = SAMPLE_DATASETS.find((s) => s.id === sampleId);
      if (!found) return;
      setSelectedNodeName(null);
      commit(
        (prev) => ({
          ...prev,
          chartType: found.recommendedChartType ?? prev.chartType,
          rows: hydrateRows(found.rows),
          nodeColorOverrides: {},
          style: {
            ...prev.style,
            title: found.title,
            subtitle: found.subtitle,
            numberFormat: found.numberFormat,
          },
        }),
        { label: `Load "${found.name}"` }
      );
    },
    [commit]
  );

  const handleSelectPalette = useCallback(
    (paletteId: string) => {
      const target = EXECUTIVE_PALETTES.find((p) => p.id === paletteId);
      commit(
        (prev) =>
          prev.activePaletteId === paletteId ? prev : { ...prev, activePaletteId: paletteId },
        { label: `Apply ${target?.name || 'palette'}` }
      );
    },
    [commit]
  );

  const handleUpdateSwatch = useCallback(
    (index: number, hex: string) => {
      commit(
        (prev) => {
          const palette =
            EXECUTIVE_PALETTES.find((p) => p.id === prev.activePaletteId) || EXECUTIVE_PALETTES[0];
          const current = prev.customPaletteColors[palette.id] || [...palette.colors];
          const next = [...current];
          next[index] = hex;
          return {
            ...prev,
            customPaletteColors: { ...prev.customPaletteColors, [palette.id]: next },
          };
        },
        {
          label: 'Edit palette colour',
          groupKey: `swatch:${activePalette.id}:${index}`,
        }
      );
    },
    [commit, activePalette.id]
  );

  const handleAddSwatch = useCallback(() => {
    commit(
      (prev) => {
        const palette =
          EXECUTIVE_PALETTES.find((p) => p.id === prev.activePaletteId) || EXECUTIVE_PALETTES[0];
        const current = prev.customPaletteColors[palette.id] || [...palette.colors];
        if (current.length >= 12) return prev;
        const nextColor = current[current.length % palette.colors.length] || '#334155';
        return {
          ...prev,
          customPaletteColors: {
            ...prev.customPaletteColors,
            [palette.id]: [...current, nextColor],
          },
        };
      },
      { label: 'Add palette swatch' }
    );
  }, [commit]);

  const handleRemoveSwatch = useCallback(
    (index: number) => {
      commit(
        (prev) => {
          const palette =
            EXECUTIVE_PALETTES.find((p) => p.id === prev.activePaletteId) || EXECUTIVE_PALETTES[0];
          const current = prev.customPaletteColors[palette.id] || [...palette.colors];
          if (current.length <= 2) return prev;
          return {
            ...prev,
            customPaletteColors: {
              ...prev.customPaletteColors,
              [palette.id]: current.filter((_, idx) => idx !== index),
            },
          };
        },
        { label: 'Remove palette swatch' }
      );
    },
    [commit]
  );

  const handleResetPalette = useCallback(() => {
    commit(
      (prev) => {
        if (!prev.customPaletteColors[prev.activePaletteId]) return prev;
        const next = { ...prev.customPaletteColors };
        delete next[prev.activePaletteId];
        return { ...prev, customPaletteColors: next };
      },
      { label: 'Reset palette swatches' }
    );
  }, [commit]);

  const handleSetNodeColor = useCallback(
    (nodeName: string, hex: string) => {
      commit(
        (prev) => ({
          ...prev,
          nodeColorOverrides: { ...prev.nodeColorOverrides, [nodeName]: hex },
        }),
        {
          label: `Recolour "${nodeName}"`,
          groupKey: `nodeColor:${nodeName}`,
        }
      );
    },
    [commit]
  );

  const handleClearNodeColor = useCallback(
    (nodeName: string) => {
      commit(
        (prev) => {
          if (!prev.nodeColorOverrides[nodeName]) return prev;
          const next = { ...prev.nodeColorOverrides };
          delete next[nodeName];
          return { ...prev, nodeColorOverrides: next };
        },
        { label: `Reset "${nodeName}" colour` }
      );
    },
    [commit]
  );

  const handleClearAllNodeColors = useCallback(() => {
    commit(
      (prev) =>
        Object.keys(prev.nodeColorOverrides).length === 0
          ? prev
          : { ...prev, nodeColorOverrides: {} },
      { label: 'Clear all node colour overrides' }
    );
  }, [commit]);

  const handleUpdateStyle = useCallback(
    (patch: Partial<SankeyStyleConfig>) => {
      const continuousKeys = new Set([
        'nodeWidth',
        'nodePadding',
        'ribbonOpacity',
        'fontSize',
        'title',
        'subtitle',
        'chordRingThickness',
        'chordPadAngle',
        'bumpSpacing',
      ]);
      const patchKeys = Object.keys(patch).sort();
      const isContinuous = patchKeys.every((k) => continuousKeys.has(k));

      commit(
        (prev) => ({
          ...prev,
          style: { ...prev.style, ...patch },
        }),
        {
          label: 'Update layout & styling',
          groupKey: isContinuous ? `style:${patchKeys.join(',')}` : undefined,
        }
      );
    },
    [commit]
  );

  const handleExportPptx = async () => {
    if (activeDiagnostic || activeNodeEntries.length === 0) {
      flashStatus('Fix data errors before exporting.');
      return;
    }
    setIsExportingPptx(true);
    try {
      if (chartType === 'chord') {
        await exportChordToPptx(chordLayout, aspectRatio, style);
      } else if (chartType === 'area-bump') {
        await exportAreaBumpToPptx(areaBumpLayout, aspectRatio, style);
      } else {
        await exportSankeyToPptx(sankeyLayout, aspectRatio, style);
      }
      flashStatus('Native PPTX downloaded.');
    } catch (err) {
      flashStatus(err instanceof Error ? err.message : 'PPTX export failed.');
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleExportSvg = () => {
    if (!svgRef.current || activeDiagnostic || activeNodeEntries.length === 0) {
      flashStatus('Fix data errors before exporting.');
      return;
    }
    exportSankeyToSvg(svgRef.current, style.title);
    flashStatus('SVG downloaded.');
  };

  const handleExportPng = async () => {
    if (!svgRef.current || activeDiagnostic || activeNodeEntries.length === 0) {
      flashStatus('Fix data errors before exporting.');
      return;
    }
    setIsExportingPng(true);
    try {
      await exportSankeyToPng(svgRef.current, aspectRatio, style.title);
      flashStatus('PNG downloaded.');
    } catch (err) {
      flashStatus(err instanceof Error ? err.message : 'PNG export failed.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const canExport = !activeDiagnostic && activeNodeEntries.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F5F7] text-slate-900 lg:h-screen lg:overflow-hidden">
      {/* Top Toolbar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
        <div className="flex items-center gap-2.5 shrink-0">
          <Layers className="h-4 w-4 text-slate-900" aria-hidden="true" />
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            SankeyStudio
          </span>
        </div>

        {/* Slide Aspect Ratio Segmented Control */}
        <div
          role="group"
          aria-label="Slide aspect ratio"
          className="hidden sm:flex items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          <button
            type="button"
            onClick={() => handleSetAspectRatio('16:9')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              aspectRatio === '16:9'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            16:9 Widescreen
          </button>
          <button
            type="button"
            onClick={() => handleSetAspectRatio('4:3')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              aspectRatio === '4:3'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4:3 Standard
          </button>
        </div>

        {/* Undo / Redo + Export Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {exportStatus && (
            <span className="hidden xl:inline text-xs font-medium text-slate-600 mr-1 whitespace-nowrap">
              {exportStatus}
            </span>
          )}

          <div className="flex items-center gap-1" role="group" aria-label="History controls">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title={undoLabel ? `Undo: ${undoLabel} (Ctrl/⌘Z)` : 'Nothing to undo (Ctrl/⌘Z)'}
              aria-label={undoLabel ? `Undo ${undoLabel}` : 'Undo'}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title={redoLabel ? `Redo: ${redoLabel} (Ctrl/⌘⇧Z)` : 'Nothing to redo (Ctrl/⌘⇧Z)'}
              aria-label={redoLabel ? `Redo ${redoLabel}` : 'Redo'}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Redo2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Redo</span>
            </button>
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200 mx-0.5" aria-hidden="true" />

          <button
            type="button"
            disabled={!canExport}
            onClick={handleExportSvg}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
          >
            <FileCode2 className="h-3.5 w-3.5 text-slate-500" />
            Export SVG
          </button>
          <button
            type="button"
            disabled={!canExport || isExportingPng}
            onClick={handleExportPng}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
          >
            <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
            {isExportingPng ? 'Exporting...' : 'Export PNG'}
          </button>
          <button
            type="button"
            disabled={!canExport || isExportingPptx}
            onClick={handleExportPptx}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            {isExportingPptx ? 'Building PPTX...' : 'Download Native PPTX'}
          </button>
        </div>
      </header>

      {/* Main 2-Column Split Workspace */}
      <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        {/* Left Sidebar (380px width, scrollable) */}
        <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:w-[380px] lg:border-b-0 lg:border-r lg:overflow-hidden">
          {/* Diagram Type Switcher */}
          <div className="border-b border-slate-200 px-3 py-2.5">
            <div
              role="group"
              aria-label="Chart type"
              className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
            >
              <button
                type="button"
                onClick={() => handleSetChartType('sankey')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  chartType === 'sankey'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GitMerge className="h-3.5 w-3.5" />
                Sankey
              </button>
              <button
                type="button"
                onClick={() => handleSetChartType('chord')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  chartType === 'chord'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CircleDot className="h-3.5 w-3.5" />
                Chord
              </button>
              <button
                type="button"
                onClick={() => handleSetChartType('area-bump')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  chartType === 'area-bump'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Area Bump
              </button>
            </div>
          </div>

          {/* Mobile Aspect Ratio Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 sm:hidden">
            <span className="text-xs font-medium text-slate-600">Slide Aspect Ratio</span>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => handleSetAspectRatio('16:9')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  aspectRatio === '16:9' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                16:9
              </button>
              <button
                type="button"
                onClick={() => handleSetAspectRatio('4:3')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  aspectRatio === '4:3' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                4:3
              </button>
            </div>
          </div>

          {/* 3-Tab Sidebar Switcher */}
          <div
            role="tablist"
            aria-label="Editor controls"
            className="grid shrink-0 grid-cols-3 border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'data'}
              onClick={() => setActiveTab('data')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'data'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Data Input
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'palettes'}
              onClick={() => setActiveTab('palettes')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'palettes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PaletteIcon className="h-3.5 w-3.5" />
              Palettes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'layout'}
              onClick={() => setActiveTab('layout')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'layout'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Layout
            </button>
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'data' && (
              <DataInputTab
                chartType={chartType}
                rows={rows}
                diagnostic={activeDiagnostic}
                totalRootInflow={activeTotalFlow}
                nodeCount={activeNodeEntries.length}
                numberFormat={style.numberFormat}
                onUpdateRow={handleUpdateRow}
                onDeleteRow={handleDeleteRow}
                onAddRow={handleAddRow}
                onOpenBulkPaste={() => setIsBulkModalOpen(true)}
                onLoadSample={handleLoadSample}
              />
            )}

            {activeTab === 'palettes' && (
              <PalettesTab
                activePaletteId={activePaletteId}
                activeColors={activeColors}
                nodes={activeNodeEntries}
                selectedNodeName={selectedNodeName}
                nodeColorOverrides={nodeColorOverrides}
                onSelectPalette={handleSelectPalette}
                onUpdateSwatch={handleUpdateSwatch}
                onAddSwatch={handleAddSwatch}
                onRemoveSwatch={handleRemoveSwatch}
                onResetPalette={handleResetPalette}
                onSelectNode={setSelectedNodeName}
                onSetNodeColor={handleSetNodeColor}
                onClearNodeColor={handleClearNodeColor}
                onClearAllNodeColors={handleClearAllNodeColors}
              />
            )}

            {activeTab === 'layout' && (
              <LayoutStylingTab
                chartType={chartType}
                style={style}
                onChange={handleUpdateStyle}
              />
            )}
          </div>
        </aside>

        {/* Right Main Area: Live Slide Preview */}
        <main className="flex-1 overflow-auto bg-[#F4F5F7]">
          <SlidePreviewCanvas
            svgRef={svgRef}
            chartType={chartType}
            sankeyLayout={sankeyLayout}
            chordLayout={chordLayout}
            areaBumpLayout={areaBumpLayout}
            aspectRatio={aspectRatio}
            style={style}
            selectedNodeName={selectedNodeName}
            nodeColorOverrides={nodeColorOverrides}
            onSelectNode={setSelectedNodeName}
            onSetNodeColor={handleSetNodeColor}
            onClearNodeColor={handleClearNodeColor}
            onUpdateStyle={handleUpdateStyle}
          />
        </main>
      </div>

      {/* Bulk Paste / CSV Import Modal */}
      <BulkPasteModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onApplyRows={handleApplyBulkRows}
      />
    </div>
  );
}
