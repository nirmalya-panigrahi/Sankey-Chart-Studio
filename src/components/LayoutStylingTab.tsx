import React from 'react';
import { ChartType, LinkColorMode, NodeAlign, NumberFormat, SankeyStyleConfig } from '../types';

interface LayoutStylingTabProps {
  chartType: ChartType;
  style: SankeyStyleConfig;
  onChange: (patch: Partial<SankeyStyleConfig>) => void;
}

export const LayoutStylingTab: React.FC<LayoutStylingTabProps> = ({
  chartType,
  style,
  onChange,
}) => {
  const linkModes: Array<{ value: LinkColorMode; label: string }> = [
    { value: 'source', label: 'Source Node' },
    { value: 'target', label: 'Target Node' },
    { value: 'neutral', label: 'Neutral Slate' },
  ];

  const alignModes: Array<{ value: NodeAlign; label: string }> = [
    { value: 'justify', label: 'Justify' },
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
  ];

  const numberFormats: Array<{ value: NumberFormat; label: string; example: string }> = [
    { value: 'raw', label: 'Raw Number', example: '74,000' },
    { value: 'usd', label: 'Currency ($)', example: '$74,000' },
    { value: 'inr', label: 'Currency (₹)', example: '₹74,000' },
    { value: 'compact', label: 'Compact (K/M/B)', example: '74K' },
    { value: 'percent', label: 'Percentage (%)', example: '61.7%' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Slide Title & Subtitle */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xs font-semibold text-slate-900">
            Slide Header
          </h3>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={style.showHeader}
              onChange={(e) => onChange({ showHeader: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-900"
            />
            Show on Slide
          </label>
        </div>

        <div className={`space-y-2 ${!style.showHeader ? 'opacity-50' : ''}`}>
          <div>
            <label htmlFor="slide-title-input" className="mb-1 block text-[11px] font-medium text-slate-600">
              Slide Title
            </label>
            <input
              id="slide-title-input"
              type="text"
              value={style.title}
              disabled={!style.showHeader}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Enter slide title..."
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="slide-subtitle-input" className="mb-1 block text-[11px] font-medium text-slate-600">
              Subtitle
            </label>
            <input
              id="slide-subtitle-input"
              type="text"
              value={style.subtitle}
              disabled={!style.showHeader}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              placeholder="Enter subtitle..."
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400 disabled:bg-slate-50"
            />
          </div>
        </div>
      </section>

      <hr className="border-slate-200" />

      {/* Geometry Sliders */}
      <section className="space-y-4">
        <h3 className="font-display text-xs font-semibold text-slate-900">
          Geometry &amp; Typography
        </h3>

        {chartType === 'sankey' ? (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="slider-node-width" className="text-slate-700">
                  Node Width
                </label>
                <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                  {style.nodeWidth} px
                </span>
              </div>
              <input
                id="slider-node-width"
                type="range"
                min={8}
                max={40}
                step={1}
                value={style.nodeWidth}
                onChange={(e) => onChange({ nodeWidth: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="slider-node-padding" className="text-slate-700">
                  Node Padding
                </label>
                <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                  {style.nodePadding} px
                </span>
              </div>
              <input
                id="slider-node-padding"
                type="range"
                min={6}
                max={48}
                step={1}
                value={style.nodePadding}
                onChange={(e) => onChange({ nodePadding: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </>
        ) : chartType === 'chord' ? (
          <>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="slider-arc-thickness" className="text-slate-700">
                  Arc Ring Thickness
                </label>
                <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                  {style.chordRingThickness} px
                </span>
              </div>
              <input
                id="slider-arc-thickness"
                type="range"
                min={8}
                max={34}
                step={1}
                value={style.chordRingThickness}
                onChange={(e) => onChange({ chordRingThickness: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="slider-arc-gap" className="text-slate-700">
                  Arc Padding Gap
                </label>
                <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                  {style.chordPadAngle}°
                </span>
              </div>
              <input
                id="slider-arc-gap"
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={style.chordPadAngle}
                onChange={(e) => onChange({ chordPadAngle: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="slider-bump-spacing" className="text-slate-700">
                Ribbon Vertical Gap
              </label>
              <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                {style.bumpSpacing} px
              </span>
            </div>
            <input
              id="slider-bump-spacing"
              type="range"
              min={2}
              max={28}
              step={1}
              value={style.bumpSpacing}
              onChange={(e) => onChange({ bumpSpacing: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-ribbon-opacity" className="text-slate-700">
              Ribbon Opacity
            </label>
            <span className="font-mono text-[11px] text-slate-600 tabular-nums">
              {style.ribbonOpacity}%
            </span>
          </div>
          <input
            id="slider-ribbon-opacity"
            type="range"
            min={20}
            max={95}
            step={1}
            value={style.ribbonOpacity}
            onChange={(e) => onChange({ ribbonOpacity: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-font-size" className="text-slate-700">
              Label Font Size
            </label>
            <span className="font-mono text-[11px] text-slate-600 tabular-nums">
              {style.fontSize} px
            </span>
          </div>
          <input
            id="slider-font-size"
            type="range"
            min={9}
            max={18}
            step={0.5}
            value={style.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </section>

      <hr className="border-slate-200" />

      {/* Link Colour Mode & Chart-Specific Layout Mode */}
      <section className="space-y-4">
        {chartType !== 'area-bump' && (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-800">Link Colour Mode</span>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
              {linkModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => onChange({ linkColorMode: mode.value })}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    style.linkColorMode === mode.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {chartType === 'sankey' ? (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-800">Node Alignment</span>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
              {alignModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => onChange({ nodeAlign: mode.value })}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    style.nodeAlign === mode.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        ) : chartType === 'chord' ? (
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-800">Chord Ribbon Mode</span>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => onChange({ chordDirected: true })}
                className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  style.chordDirected
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Directed Flows
              </button>
              <button
                type="button"
                onClick={() => onChange({ chordDirected: false })}
                className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  !style.chordDirected
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Combined Bilateral
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-800">Volume Scaling</span>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => onChange({ bumpNormalize: false })}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    !style.bumpNormalize
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Absolute Volume
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ bumpNormalize: true })}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    style.bumpNormalize
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  100% Share
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-medium text-slate-800">Show Left Start Labels</span>
              <button
                type="button"
                role="switch"
                aria-checked={style.bumpShowLeftLabels}
                onClick={() => onChange({ bumpShowLeftLabels: !style.bumpShowLeftLabels })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  style.bumpShowLeftLabels ? 'bg-slate-900' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    style.bumpShowLeftLabels ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </section>

      <hr className="border-slate-200" />

      {/* Labels & Number Formatting */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-800">Show Values on Labels</span>
          <button
            type="button"
            role="switch"
            aria-checked={style.showValues}
            onClick={() => onChange({ showValues: !style.showValues })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              style.showValues ? 'bg-slate-900' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                style.showValues ? 'translate-x-4.5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="number-format-select" className="block text-xs font-medium text-slate-800">
            Number Formatting
          </label>
          <select
            id="number-format-select"
            value={style.numberFormat}
            onChange={(e) => onChange({ numberFormat: e.target.value as NumberFormat })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-400"
          >
            {numberFormats.map((fmt) => (
              <option key={fmt.value} value={fmt.value}>
                {fmt.label} — e.g. {fmt.example}
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
};
