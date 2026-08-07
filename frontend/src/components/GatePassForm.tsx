import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { X, Download, Save, CheckCircle2 } from 'lucide-react';
import { fetchNextPassNo, createGatePass, updateGatePass, fetchGatePasses } from '../services/api';
import type { GatePassDTO } from '../services/api';
import './GatePass.css';

const MATERIAL_OPTIONS = ['20mm', '40mm', '10mm', 'Dust', 'Grit', 'Stone Chips'];

function getNow() {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const period: 'AM' | 'PM' = h < 12 ? 'AM' : 'PM';
  const h12 = (h % 12 || 12).toString().padStart(2, '0');
  return { date, time: `${h12}:${m}`, period };
}

export interface GatePassRecord {
  id?: string | number;
  no: number;
  date: string;
  day?: number;
  month?: number;
  year?: number;
  partyName: string;
  vehicleNumber: string;
  materials: string;
  time?: string;
  timePeriod?: 'AM' | 'PM';
  loadWeight: number;
  emptyWeight: number;
  netWeight: number;
  netTons?: number;
  villageName: string;
  gatePassSignature?: string;
  timestamp?: string;
}

interface FormState {
  partyName: string;
  vehicleNumber: string;
  materials: string;
  time: string;
  timePeriod: 'AM' | 'PM';
  loadWeight: string;
  emptyWeight: string;
  villageName: string;
  gatePassSignature: string;
}

interface GatePassFormProps {
  initialRecord?: GatePassRecord | null;
  onSaved?: (updatedRecord: GatePassRecord) => void;
  hideInnerHeader?: boolean;
}

const GatePassForm: React.FC<GatePassFormProps> = ({ initialRecord, onSaved, hideInnerHeader }) => {
  const { date: todayDefault, time: nowTime, period: nowPeriod } = getNow();

  const isEditing = Boolean(initialRecord);
  const [autoNo, setAutoNo] = useState<number>(initialRecord ? initialRecord.no : 1001);
  const [isSaving, setIsSaving] = useState(false);
  const today = initialRecord ? initialRecord.date : todayDefault;

  useEffect(() => {
    if (!initialRecord) {
      fetchNextPassNo()
        .then(nextNo => setAutoNo(nextNo))
        .catch(err => console.warn('Could not fetch next pass number:', err));
    }
  }, [initialRecord]);

  const [form, setForm] = useState<FormState>({
    partyName: initialRecord?.partyName || '',
    vehicleNumber: initialRecord?.vehicleNumber || '',
    materials: initialRecord?.materials || '20mm',
    time: initialRecord?.time || nowTime,
    timePeriod: initialRecord?.timePeriod || nowPeriod,
    loadWeight: initialRecord?.loadWeight !== undefined ? String(initialRecord.loadWeight) : '',
    emptyWeight: initialRecord?.emptyWeight !== undefined ? String(initialRecord.emptyWeight) : '',
    villageName: initialRecord?.villageName || '',
    gatePassSignature: initialRecord?.gatePassSignature || 'Shiv Stone (Auth)',
  });

  useEffect(() => {
    if (initialRecord) {
      setForm({
        partyName: initialRecord.partyName || '',
        vehicleNumber: initialRecord.vehicleNumber || '',
        materials: initialRecord.materials || '20mm',
        time: initialRecord.time || nowTime,
        timePeriod: initialRecord.timePeriod || nowPeriod,
        loadWeight: initialRecord.loadWeight !== undefined ? String(initialRecord.loadWeight) : '',
        emptyWeight: initialRecord.emptyWeight !== undefined ? String(initialRecord.emptyWeight) : '',
        villageName: initialRecord.villageName || '',
        gatePassSignature: initialRecord.gatePassSignature || 'Shiv Stone (Auth)',
      });
      setSaved(true);
    }
  }, [initialRecord, nowTime, nowPeriod]);

  const [saved, setSaved] = useState(isEditing);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [exporting, setExporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // ── Party Autocomplete State ─────────────────────────────────────────────
  interface PartySuggestion {
    partyName: string;
    vehicleNumber: string;
    villageName?: string;
  }
  const [suggestions, setSuggestions] = useState<PartySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const partyInputRef = useRef<HTMLInputElement>(null);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback((q: string) => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    if (q.trim().length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
    fetchTimerRef.current = setTimeout(async () => {
      try {
        const dtos = await fetchGatePasses(q.trim());
        // Deduplicate: unique partyName + vehicleNumber combos, most recent first
        const seen = new Set<string>();
        const unique: PartySuggestion[] = [];
        for (const d of dtos) {
          const key = `${d.partyName?.toLowerCase()}||${d.vehicleNumber?.toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push({
              partyName: d.partyName,
              vehicleNumber: d.vehicleNumber,
              villageName: d.villageName,
            });
          }
        }
        setSuggestions(unique.slice(0, 8));
        setShowSuggestions(unique.length > 0);
        setHighlightedIdx(-1);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);
  }, []);

  const handleSelectSuggestion = (s: PartySuggestion) => {
    setForm(prev => ({
      ...prev,
      partyName: s.partyName,
      vehicleNumber: s.vehicleNumber,
      villageName: s.villageName || prev.villageName,
    }));
    setErrors(prev => ({ ...prev, partyName: '', vehicleNumber: '' }));
    setSaved(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIdx(-1);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        partyInputRef.current && !partyInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const previewRef = useRef<HTMLDivElement>(null);
  const modalPreviewRef = useRef<HTMLDivElement>(null);

  // Net weight — live computed
  const netWeight = (() => {
    const l = parseFloat(form.loadWeight);
    const e = parseFloat(form.emptyWeight);
    return !isNaN(l) && !isNaN(e) && l > e ? l - e : 0;
  })();

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setSaved(false);
  };

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.partyName.trim()) {
      e.partyName = 'Party name is required';
    } else if (form.partyName.length > 100) {
      e.partyName = 'Party name must not exceed 100 characters';
    }
    if (!form.vehicleNumber.trim()) e.vehicleNumber = 'Vehicle number is required';
    if (!form.time.trim()) e.time = 'Time is required';
    if (!form.loadWeight || isNaN(Number(form.loadWeight)))
      e.loadWeight = 'Valid load weight required';
    if (!form.emptyWeight || isNaN(Number(form.emptyWeight)))
      e.emptyWeight = 'Valid empty weight required';
    if (Number(form.loadWeight) <= Number(form.emptyWeight))
      e.loadWeight = 'Load weight must exceed empty weight';
    if (!form.villageName.trim())
      e.villageName = 'Village name is required';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setIsSaving(true);
    try {
      const payload: GatePassDTO = {
        partyName: form.partyName,
        vehicleNumber: form.vehicleNumber,
        materials: form.materials,
        time: form.time,
        timePeriod: form.timePeriod,
        date: today,
        loadWeight: Number(form.loadWeight),
        emptyWeight: Number(form.emptyWeight),
        villageName: form.villageName,
        gatePassSignature: form.gatePassSignature,
      };

      let result: GatePassDTO;
      if (initialRecord?.id) {
        result = await updateGatePass(initialRecord.id, payload);
      } else {
        result = await createGatePass(payload);
      }

      if (result.passNo) {
        setAutoNo(result.passNo);
      }

      setSaved(true);

      const recordToSave: GatePassRecord = {
        id: result.id,
        no: result.passNo || autoNo,
        date: result.date || today,
        partyName: result.partyName,
        vehicleNumber: result.vehicleNumber,
        materials: result.materials,
        time: result.time,
        timePeriod: result.timePeriod as 'AM' | 'PM',
        loadWeight: result.loadWeight,
        emptyWeight: result.emptyWeight,
        netWeight: result.netWeight || netWeight,
        netTons: result.netTons,
        villageName: result.villageName || '',
        gatePassSignature: result.gatePassSignature,
        timestamp: result.createdAt,
      };

      if (onSaved) {
        onSaved(recordToSave);
      }
    } catch (err: any) {
      console.error('Error saving gate pass to DB:', err);
      setErrors({ partyName: err.message || 'Failed to save to database.' });
    } finally {
      setIsSaving(false);
    }
  };

  const exportPDF = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current || !saved) return;
    setExporting(true);
    const element = ref.current;
    try {
      element.classList.add('rendering-pdf');
      const canvas = await html2canvas(element, {
        scale: 2, // 2x scale for 300 DPI crispness at ~120KB
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 1000,
        logging: false,
      });
      element.classList.remove('rendering-pdf');

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      const pdfWidth = 105; // 105mm standard width
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
        compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`GatePass-${autoNo}.pdf`);
    } catch (err) {
      console.error('Export PDF error:', err);
    } finally {
      element.classList.remove('rendering-pdf');
      setExporting(false);
    }
  };

  // Receipt Component
  const GatePassReceipt = ({ innerRef, isModal = false }: { innerRef: React.RefObject<HTMLDivElement | null>; isModal?: boolean }) => (
    <div className={`gate-pass-receipt ${isModal ? 'modal-receipt' : ''}`} ref={innerRef}>
      {/* Header */}
      <div className="rcp-header">
        <div className="rcp-top-row">
          <div className="rcp-badge">GATE PASS</div>
          <div className="rcp-phones">Mo. 99798 44133 &nbsp;|&nbsp; Mo. 94274 44133</div>
        </div>
        <div className="rcp-company-name">Shiv Stone Crusher</div>
        <div className="rcp-address">
          Jampar Road, At. Gunda, Ta. Bhanvad, Dist. - Dev Bhumi Dwarka
        </div>
      </div>

      <div className="rcp-hr" />

      {/* No & Date */}
      <div className="rcp-no-date">
        <div className="rcp-nd-item">
          <span className="rcp-nd-label">No.</span>
          <span className="rcp-no-val">{autoNo}</span>
        </div>
        <div className="rcp-nd-item">
          <span className="rcp-nd-label">Date :</span>
          <span className="rcp-nd-value">{today}</span>
        </div>
      </div>

      {/* Fields */}
      <div className="rcp-field">
        <div className="rcp-field-label">Party's Name</div>
        <div className="rcp-field-line">
          <span className="rcp-field-value">{form.partyName || ''}</span>
        </div>
      </div>

      <div className="rcp-field">
        <div className="rcp-field-label">Vehicle Number</div>
        <div className="rcp-field-line">
          <span className="rcp-field-value">{form.vehicleNumber ? form.vehicleNumber.toUpperCase() : ''}</span>
        </div>
      </div>

      <div className="rcp-field">
        <div className="rcp-field-label">Materials</div>
        <div className="rcp-field-line rcp-with-unit">
          <span className="rcp-field-value">{form.materials}</span>
          <span className="rcp-unit">mm</span>
        </div>
      </div>

      <div className="rcp-field">
        <div className="rcp-field-label">Time</div>
        <div className="rcp-field-line rcp-with-unit">
          <span className="rcp-field-value">{form.time}</span>
          <span className="rcp-unit">{form.timePeriod}</span>
        </div>
      </div>

      <div className="rcp-field">
        <div className="rcp-field-label">Load Weight</div>
        <div className="rcp-field-line">
          <span className="rcp-field-value">
            {form.loadWeight ? `${Number(form.loadWeight).toLocaleString()} kg` : ''}
          </span>
        </div>
      </div>

      <div className="rcp-field">
        <div className="rcp-field-label">Empty Weight</div>
        <div className="rcp-field-line">
          <span className="rcp-field-value">
            {form.emptyWeight ? `${Number(form.emptyWeight).toLocaleString()} kg` : ''}
          </span>
        </div>
      </div>

      <div className="rcp-field">
        <div className="rcp-field-label">Net Weight</div>
        <div className="rcp-field-line rcp-with-unit">
          <span className="rcp-field-value rcp-net">
            {netWeight > 0 ? `${(netWeight / 1000).toFixed(3)}` : ''}
          </span>
          {netWeight > 0 && <span className="rcp-unit">Ton</span>}
        </div>
      </div>

      <div className="rcp-field">
        <div className="rcp-field-label">Village Name</div>
        <div className="rcp-field-line">
          <span className="rcp-field-value">{form.villageName}</span>
        </div>
      </div>

      <div className="rcp-hr" style={{ marginTop: 16 }} />

      {/* Pre-filled Signature */}
      <div className="rcp-sigs">
        <div className="rcp-sig-col">
          <div className="rcp-sig-content cursive-sig">{form.gatePassSignature}</div>
          <div className="rcp-sig-line-solid" />
          <div className="rcp-sig-label">Gate Pass Signature</div>
        </div>
        <div className="rcp-sig-col rcp-sig-right">
          <div className="rcp-sig-content placeholder-sig">_________________</div>
          <div className="rcp-sig-line-solid" />
          <div className="rcp-sig-label">Receiver Signature</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="gp-page gp-modal-layout">
        {/* ── LEFT: Fixed Printable Gate Pass Receipt Preview ──────────────── */}
        <div className="gp-preview-panel">
          <div className="gp-preview-bg">
            <GatePassReceipt innerRef={previewRef} />
          </div>
        </div>

        {/* ── RIGHT: Scrollable Form Inputs Panel ──────────────────────────── */}
        <div className="gp-form-panel">
          {!hideInnerHeader && (
            <div className="gp-form-header">
              <h2 className="gp-form-title">{isEditing ? `Edit Gate Pass #${autoNo}` : 'Gate Pass Form'}</h2>
              <p className="gp-form-sub">{isEditing ? 'Update pass details and save changes' : 'Fill out the details below to issue a vehicle gate pass'}</p>
            </div>
          )}

          <div className="gp-fields">
            {/* Serial No & Date */}
            <div className="gp-row">
              <div className="gp-field readonly-field">
                <label>Serial No.</label>
                <input value={autoNo} readOnly tabIndex={-1} />
              </div>
              <div className="gp-field readonly-field">
                <label>Date</label>
                <input value={today} readOnly tabIndex={-1} />
              </div>
            </div>

            {/* Party's Name with Autocomplete */}
            <div className={`gp-field ${errors.partyName ? 'has-error' : ''}`} style={{ position: 'relative' }}>
              <label>Party's Name <span className="req">*</span></label>
              <input
                ref={partyInputRef}
                placeholder="Type to search party..."
                value={form.partyName}
                maxLength={100}
                autoComplete="off"
                onChange={e => {
                  handleChange('partyName', e.target.value);
                  fetchSuggestions(e.target.value);
                }}
                onFocus={() => {
                  if (form.partyName.trim().length >= 1) fetchSuggestions(form.partyName);
                }}
                onKeyDown={e => {
                  if (!showSuggestions) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedIdx(i => Math.min(i + 1, suggestions.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedIdx(i => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter' && highlightedIdx >= 0) {
                    e.preventDefault();
                    handleSelectSuggestion(suggestions[highlightedIdx]);
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
              />
              {errors.partyName && <span className="err">{errors.partyName}</span>}

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="gp-autocomplete-dropdown" ref={suggestionsRef}>
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className={`gp-autocomplete-item ${idx === highlightedIdx ? 'highlighted' : ''}`}
                      onMouseDown={() => handleSelectSuggestion(s)}
                    >
                      <span className="gp-ac-name">{s.partyName}</span>
                      <span className="gp-ac-vehicle">{s.vehicleNumber}</span>
                      {s.villageName && <span className="gp-ac-village">{s.villageName}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Number */}
            <div className={`gp-field ${errors.vehicleNumber ? 'has-error' : ''}`}>
              <label>Vehicle Number <span className="req">*</span></label>
              <input
                placeholder="e.g. GJ 1234"
                value={form.vehicleNumber}
                onChange={e => handleChange('vehicleNumber', e.target.value.toUpperCase())}
              />
              {errors.vehicleNumber && <span className="err">{errors.vehicleNumber}</span>}
            </div>

            {/* Material & Period Row */}
            <div className="gp-row">
              <div className="gp-field">
                <label>Material <span className="req">*</span></label>
                <select
                  className="gp-select-input"
                  value={form.materials}
                  onChange={e => handleChange('materials', e.target.value)}
                >
                  {MATERIAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="gp-field">
                <label>Period <span className="req">*</span></label>
                <select
                  className="gp-select-input"
                  value={form.timePeriod}
                  onChange={e => {
                    setForm(prev => ({ ...prev, timePeriod: e.target.value as 'AM' | 'PM' }));
                    setSaved(false);
                  }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* Time */}
            <div className={`gp-field ${errors.time ? 'has-error' : ''}`}>
              <label>Time <span className="req">*</span></label>
              <input
                type="text"
                placeholder="08:07"
                value={form.time}
                onChange={e => handleChange('time', e.target.value)}
              />
              {errors.time && <span className="err">{errors.time}</span>}
            </div>

            {/* Load Weight & Empty Weight */}
            <div className="gp-row">
              <div className={`gp-field ${errors.loadWeight ? 'has-error' : ''}`}>
                <label>Load Weight (kg) <span className="req">*</span></label>
                <input
                  type="number"
                  placeholder="45"
                  value={form.loadWeight}
                  onChange={e => handleChange('loadWeight', e.target.value)}
                />
                {errors.loadWeight && <span className="err">{errors.loadWeight}</span>}
              </div>
              <div className={`gp-field ${errors.emptyWeight ? 'has-error' : ''}`}>
                <label>Empty Weight (kg) <span className="req">*</span></label>
                <input
                  type="number"
                  placeholder="22"
                  value={form.emptyWeight}
                  onChange={e => handleChange('emptyWeight', e.target.value)}
                />
                {errors.emptyWeight && <span className="err">{errors.emptyWeight}</span>}
              </div>
            </div>

            {/* Net Weight & Party Mobile */}
            <div className="gp-row">
              <div className="gp-field readonly-field">
                <label>Net Weight (Auto) — Ton</label>
                <input
                  value={netWeight > 0 ? `${(netWeight / 1000).toFixed(3)} Ton` : '—'}
                  readOnly
                  tabIndex={-1}
                  className={netWeight > 0 ? 'net-ok' : ''}
                />
              </div>

              <div className={`gp-field ${errors.villageName ? 'has-error' : ''}`}>
                <label>Village Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Bhanvad"
                  value={form.villageName}
                  onChange={e => handleChange('villageName', e.target.value)}
                />
                {errors.villageName && <span className="err">{errors.villageName}</span>}
              </div>
            </div>

            {/* Signature */}
            <div className="gp-field readonly-field">
              <label>Gate Pass Signature (Pre-filled)</label>
              <input value={form.gatePassSignature} readOnly tabIndex={-1} />
            </div>
          </div>

          {/* Actions at bottom of Form Panel */}
          <div className="gp-actions">
            <button className={`gp-btn-save ${saved ? 'saved' : ''}`} onClick={handleSave} disabled={isSaving}>
              {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              <span>{isSaving ? 'Saving to DB...' : saved ? (isEditing ? 'Updated & Saved ✓' : 'Saved Successfully') : (isEditing ? 'Update & Save' : 'Save Gate Pass')}</span>
            </button>
            <button
              className={`gp-btn-export ${!saved ? 'disabled' : ''}`}
              onClick={() => exportPDF(previewRef)}
              disabled={!saved || exporting}
            >
              <Download size={16} />
              <span>{exporting ? 'Generating PDF…' : 'Export PDF'}</span>
            </button>
          </div>
          {!saved && (
            <p className="gp-hint">Please save changes before exporting to PDF</p>
          )}
        </div>
      </div>

      {/* ── Fullscreen Preview Modal ───────────────────────── */}
      {modalOpen && (
        <div className="gp-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="gp-modal-box" onClick={e => e.stopPropagation()}>
            <div className="gp-modal-header">
              <div className="gp-modal-title">
                <span>Gate Pass Live Preview</span>
                <span className="gp-modal-sub">Pass #{autoNo}</span>
              </div>
              <div className="gp-modal-actions">
                <button
                  className={`gp-modal-export ${!saved ? 'disabled' : ''}`}
                  onClick={() => exportPDF(modalPreviewRef)}
                  disabled={!saved || exporting}
                >
                  <Download size={15} />
                  <span>{exporting ? 'Exporting…' : 'Export PDF'}</span>
                </button>
                <button className="gp-modal-close" onClick={() => setModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="gp-modal-body">
              <GatePassReceipt innerRef={modalPreviewRef} isModal={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GatePassForm;
