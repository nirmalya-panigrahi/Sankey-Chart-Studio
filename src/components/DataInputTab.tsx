import React from 'react';
import { AlertTriangle, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { SAMPLE_DATASETS } from '../palettes';
import { formatSankeyValue } from '../sankeyMath';
import { ChartType, DataDiagnostic, FlowRow, NumberFormat } from '../types';

interface DataInputTabProps {
  chartType: ChartType;
  rows: FlowRow[];
  diagnostic: DataDiagnostic | null;
  totalRootInflow: number;
  nodeCount: number;
  numberFormat: NumberFormat;
  onUpdateRow: (id: string, patch: Partial<Omit<FlowRow, 'id'>>) => void;
  onDeleteRow: (id: string) => void;
  onAddRow: () => void;
  onOpenBulkPaste: () => void;
  onLoadSample: (sampleId: string) => void;
}

export const DataInputTab: React.FC<DataInputTabProps> = ({
  chartType,
  rows,
  diagnostic,
  totalRootInflow,
  nodeCount,
  numberFormat,
  onUpdateRow,
  onDeleteRow,
  onAddRow,
  onOpenBulkPaste,
  onLoadSample,
}) => {
  const offendingSet = new Set(diagnostic?.offendingRowIds || []);
  const col1Label = chartType === 'area-bump' ? 'Series' : 'Source';
  const col2Label = chartType === 'area-bump' ? 'Period' : 'Target';

  return (
    <div className="flex flex-col gap-4">
      {/* Sample Preset + Bulk Import Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="sample-dataset-select" className="sr-only">
            Load Sample Dataset
          </label>
          <select
            id="sample-dataset-select"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onLoadSample(e.target.value);
                e.target.value = '';
              }
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-slate-400"
          >
            <option value="" disabled>
              Load sample dataset...
            </option>
            {SAMPLE_DATASETS.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenBulkPaste}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
          Bulk Paste / CSV
        </button>
      </div>

      {/* Cycle / Validation Diagnostic Alert */}
      {diagnostic && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold text-red-950">
              {diagnostic.type === 'cycle'
                ? 'Circular Loop Detected'
                : diagnostic.type === 'self-loop'
                ? 'Self-Loop Detected'
                : diagnostic.type === 'empty'
                ? 'No Flow Rows'
                : 'Invalid Flow Values'}
            </p>
            <p className="text-red-800">{diagnostic.message}</p>
          </div>
        </div>
      )}

      {/* Interactive Flow Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[1fr_1fr_84px_30px] items-center gap-1.5 border-b border-slate-200 bg-slate-50/90 px-2.5 py-2 text-[11px] font-semibold text-slate-600">
          <span>{col1Label}</span>
          <span>{col2Label}</span>
          <span className="text-right">Value</span>
          <span className="sr-only">Delete</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-slate-500">No flow rows defined yet.</p>
            <button
              type="button"
              onClick={onAddRow}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Row
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isOffending =
                offendingSet.has(row.id) ||
                !row.source.trim() ||
                !row.target.trim() ||
                !Number.isFinite(row.value) ||
                row.value <= 0;

              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-[1fr_1fr_84px_30px] items-center gap-1.5 px-2 py-1.5 transition-colors ${
                    isOffending ? 'bg-red-50/90' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <input
                    type="text"
                    value={row.source}
                    onChange={(e) => onUpdateRow(row.id, { source: e.target.value })}
                    placeholder={col1Label}
                    aria-label={col1Label}
                    className={`min-w-0 rounded border px-2 py-1 text-xs outline-none transition-colors ${
                      isOffending && offendingSet.has(row.id)
                        ? 'border-red-300 bg-white text-red-950 focus:border-red-500'
                        : 'border-transparent bg-transparent text-slate-900 hover:border-slate-200 focus:border-slate-300 focus:bg-white'
                    }`}
                  />
                  <input
                    type="text"
                    value={row.target}
                    onChange={(e) => onUpdateRow(row.id, { target: e.target.value })}
                    placeholder={col2Label}
                    aria-label={col2Label}
                    className={`min-w-0 rounded border px-2 py-1 text-xs outline-none transition-colors ${
                      isOffending && offendingSet.has(row.id)
                        ? 'border-red-300 bg-white text-red-950 focus:border-red-500'
                        : 'border-transparent bg-transparent text-slate-900 hover:border-slate-200 focus:border-slate-300 focus:bg-white'
                    }`}
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={Number.isFinite(row.value) ? row.value : ''}
                    onChange={(e) => {
                      const parsed = e.target.value === '' ? 0 : Number(e.target.value);
                      onUpdateRow(row.id, { value: parsed });
                    }}
                    placeholder="0"
                    aria-label="Flow value"
                    className={`min-w-0 rounded border px-2 py-1 text-right font-mono text-xs tabular-nums outline-none transition-colors ${
                      !Number.isFinite(row.value) || row.value <= 0
                        ? 'border-red-300 bg-white text-red-700 focus:border-red-500'
                        : 'border-transparent bg-transparent text-slate-800 hover:border-slate-200 focus:border-slate-300 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onDeleteRow(row.id)}
                    aria-label={`Delete row ${row.source} to ${row.target}`}
                    className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Row + Summary Metadata */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onAddRow}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </button>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 tabular-nums truncate">
          <span>{rows.length} rows</span>
          <span aria-hidden="true">·</span>
          <span>
            {nodeCount} {chartType === 'area-bump' ? 'series' : 'nodes'}
          </span>
          {totalRootInflow > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-700">
                {formatSankeyValue(totalRootInflow, numberFormat, totalRootInflow)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
