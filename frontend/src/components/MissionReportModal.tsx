import React, { useRef, useState } from 'react';
import { MissionSummary } from '../types/telemetry';
import { fetchMissionReport } from '../services/api';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  TrendingDown,
  Layers,
  Award,
  Sparkles,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface MissionReportModalProps {
  missionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MissionReportModal: React.FC<MissionReportModalProps> = ({
  missionId,
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<MissionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (isOpen && missionId) {
      setLoading(true);
      fetchMissionReport(missionId)
        .then((data) => {
          setReport(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, missionId]);

  if (!isOpen) return null;

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#060B14',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`InlandDeep_MissionReport_${missionId}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-abyss-950/80 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-3xl bg-abyss-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 bg-abyss-950/60">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-biolum-cyan" />
            <h2 className="font-display font-bold text-sm tracking-wide text-slate-100 uppercase">
              MISSION ANALYTICS REPORT (SPARK SQL BATCH)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={exporting || loading || !report}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-biolum-cyan hover:bg-biolum-teal text-abyss-950 font-mono font-bold text-xs transition-all shadow-[0_0_10px_rgba(0,242,254,0.3)] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'EXPORTING...' : 'EXPORT PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Document */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1" ref={reportRef}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-biolum-cyan border-t-transparent animate-spin" />
              <div className="font-mono text-xs text-slate-400">
                Running Apache Spark SQL batch aggregation...
              </div>
            </div>
          ) : !report ? (
            <div className="text-center py-12 text-slate-400 font-mono text-xs">
              No report available for mission {missionId}.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Document Banner */}
              <div className="border-b border-slate-800 pb-4">
                <div className="text-[10px] font-mono text-biolum-cyan font-bold tracking-widest uppercase">
                  FINAL-YEAR PROJECT REPORT • APACHE SPARK SQL TELEMETRY ENGINE
                </div>
                <h1 className="text-xl font-display font-bold text-slate-100 mt-1">
                  Navigating the Inland Deep: Adaptive Fusion & Homing Report
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mt-2">
                  <span>
                    MISSION: <b className="text-slate-200">{report.missionId}</b>
                  </span>
                  <span>
                    DURATION: <b className="text-slate-200">{report.durationSec.toFixed(0)}s</b>
                  </span>
                  <span>
                    SAMPLES: <b className="text-slate-200">{report.totalSamples}</b>
                  </span>
                  <span>
                    OUTCOME:{' '}
                    <b className={report.homingSuccess ? 'text-biolum-emerald' : 'text-alert-amber'}>
                      {report.homingState}
                    </b>
                  </span>
                </div>
              </div>

              {/* Research Novelty Highlight Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-biolum-cyan/15 via-abyss-950 to-biolum-teal/15 border border-biolum-cyan/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-biolum-cyan/20 border border-biolum-cyan/50 text-biolum-cyan">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-biolum-cyan font-bold uppercase">
                      THESIS CORE METRIC: ESTIMATION IMPROVEMENT
                    </div>
                    <div className="text-2xl font-display font-bold text-slate-100">
                      Error Reduced by{' '}
                      <span className="text-biolum-cyan">{report.improvementPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <div className="text-slate-400">Fixed Filter: {report.rmseFixed.toFixed(2)}m RMSE</div>
                  <div className="text-biolum-cyan font-bold">
                    Adaptive Filter: {report.rmseAdaptive.toFixed(2)}m RMSE
                  </div>
                </div>
              </div>

              {/* Spark SQL Aggregated Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-abyss-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">AVG TURBIDITY</div>
                  <div className="text-xl font-display font-bold text-slate-100 mt-1">
                    {report.avgTurbidity.toFixed(1)}{' '}
                    <span className="text-xs font-mono text-slate-400">NTU</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">Optoelectronic</div>
                </div>

                <div className="p-3 rounded-xl bg-abyss-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">MAX DEPTH</div>
                  <div className="text-xl font-display font-bold text-slate-100 mt-1">
                    {report.maxDepth.toFixed(1)}{' '}
                    <span className="text-xs font-mono text-slate-400">m</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">MS5837 Pressure</div>
                </div>

                <div className="p-3 rounded-xl bg-abyss-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">MIN BATTERY</div>
                  <div className="text-xl font-display font-bold text-slate-100 mt-1">
                    {report.minBattery.toFixed(1)}{' '}
                    <span className="text-xs font-mono text-slate-400">%</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">BMS Voltage</div>
                </div>

                <div className="p-3 rounded-xl bg-abyss-950 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400">HOMING SUCCESS</div>
                  <div className="text-xl font-display font-bold text-biolum-emerald mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{report.homingSuccess ? 'DOCKED' : 'COMPLETED'}</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Target &lt; 1.2m
                  </div>
                </div>
              </div>

              {/* State Machine Transition Log Summary */}
              <div className="p-4 rounded-xl bg-abyss-950 border border-slate-800 flex flex-col gap-2">
                <div className="text-xs font-mono font-bold text-slate-300">
                  FAIL-SAFE HOMING STATE MACHINE LOG
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Trigger Reason: <span className="text-slate-200">{report.homingTrigger}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Storage: Partitioned Parquet table saved to <code>data/parquet/missions/{report.missionId}</code> and indexed in SQLite.
                </div>
              </div>

              {/* Academic Disclaimer */}
              <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500 flex justify-between items-center">
                <span>Inland Deep Console • Final-Year Engineering Project</span>
                <span>Spark 3.5 SQL Engine</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
