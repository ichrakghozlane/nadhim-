// ══════════════════════════════════════════════════════════
//  TAB: جدول التوقيت — نسخة محسّنة (تصميم + حفظ دائم)
// ══════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Teacher, Mosque, ScheduleRow, SentSchedule, Notif } from '../../types';

// ── helpers (نفس اللي في الملف الأصلي) ──
function gst<T>(k: string, d: T): T {
  try { return JSON.parse(localStorage.getItem(k)!) ?? d; } catch { return d; }
}
function sst<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new StorageEvent('storage', { key: k }));
}

const SEMESTERS = [
  { id: 1, label: 'الفصل الأول',  range: 'جانفي – أفريل'    },
  { id: 2, label: 'الفصل الثاني', range: 'ماي – أوت'        },
  { id: 3, label: 'الفصل الثالث', range: 'سبتمبر – ديسمبر'  },
] as const;

const DAYS_AR   = ['الاحد','الاثنين','الثلاثاء','الاربعاء','الخميس','الجمعة','السبت'];
// ترتيب العرض في الجدول (من اليمين)
const DAYS_ORDER = ['السبت','الجمعة','الخميس','الاربعاء','الثلاثاء','الاثنين','الاحد'];

// مفتاح التخزين — مرتبط بالمؤطر + الفصل حتى لا تتضارب البيانات
function schedKey(teacherId: number, sem: number) {
  return `sentSchedules_t${teacherId}_s${sem}`;
}

function useToast() {
  const [t, sT] = useState('');
  const show = useCallback((m: string) => { sT(m); setTimeout(() => sT(''), 2500); }, []);

  return { toast: t, show };
}

// ── بطاقة حصة صغيرة في الجدول ──
function SessionPill({ row, onRemove }: { row: ScheduleRow; onRemove?: () => void }) {
  return (
    <div style={{
      background:'var(--g)',
      color: '#fff',
      borderRadius: 6,
      padding: '4px 8px',
      fontSize: 11,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
      marginBottom: 3,
    }}>
      <span style={{ whiteSpace: 'nowrap' }}>{row.startTime}–{row.endTime}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            background: 'rgba(255,255,255,0.25)',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            cursor: 'pointer',
            fontSize: 11,
            lineHeight: 1,
            padding: '1px 5px',
          }}
        >✕</button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
export default function ScheduleTab({
  teacher,
  myMosque,
}: {
  teacher: Teacher;
  myMosque: Mosque | undefined;
}) {
  const [sem, setSem]         = useState<1 | 2 | 3>(1);
  const [rows, setRows]       = useState<ScheduleRow[]>([]);
  const [sent, setSent]       = useState(false);
  const [sentDate, setSentDate] = useState('');

  // حقول إضافة حصة
  const [newDay,   setNewDay]   = useState('الاحد');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd,   setNewEnd]   = useState('10:00');
  const [addErr,   setAddErr]   = useState('');

  const { toast, show } = useToast();

  // ── تحميل البيانات كل ما يتغير الفصل أو المؤطر ──
  // هذا هو الإصلاح الرئيسي: مفتاح مخصص لكل مؤطر+فصل
  useEffect(() => {
    const load = () => {
      const saved = gst<SentSchedule | null>(schedKey(teacher.id, sem), null);
      if (saved) {
        setRows(saved.rows   ?? []);
        setSent(saved.sent   ?? false);
        setSentDate(saved.sentDate ?? '');
      } else {
        setRows([]);
        setSent(false);
        setSentDate('');
      }
    };
    load();
    // نستمع لـ storage حتى لو فُتح في تبويب آخر
    const handler = (e: StorageEvent) => {
      if (e.key === schedKey(teacher.id, sem)) load();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [teacher.id, sem]);

  // ── حفظ مسودة فورية كلما تغيرت الصفوف ──
  const persistDraft = useCallback((newRows: ScheduleRow[], isSent = false, date = '') => {
    const payload: SentSchedule = { rows: newRows, sent: isSent, sentDate: date, sem };
    sst(schedKey(teacher.id, sem), payload);
  }, [teacher.id, sem]);

  const addRow = () => {
    setAddErr('');
    if (!newStart || !newEnd) { setAddErr('⚠️ حدد وقت البداية والنهاية'); return; }
    if (newStart >= newEnd)   { setAddErr('⚠️ وقت البداية يجب أن يكون قبل النهاية'); return; }
    const row: ScheduleRow = {
      id: Date.now(),
      day: newDay,
      startTime: newStart,
      endTime: newEnd,
      note: '',
    };
    const updated = [...rows, row];
    setRows(updated);
    persistDraft(updated, false);
    show('✅ تمت إضافة الحصة');
  };

  const removeRow = (id: number) => {
    const updated = rows.filter(r => r.id !== id);
    setRows(updated);
    persistDraft(updated, sent, sentDate);
  };

  const saveDraft = () => {
    persistDraft(rows, false);
    setSent(false);
    show('💾 تم حفظ المسودة');
  };

  const sendToAll = () => {
    if (rows.length === 0) { show('⚠️ أضف حصة واحدة على الأقل'); return; }
    const date = new Date().toLocaleString('ar-DZ', { numberingSystem: 'latn' });
    persistDraft(rows, true, date);
    setSent(true);
    setSentDate(date);

    // ── إشعار الأدمن ──
    const an = gst<Notif[]>('adminNotifs', []);
    an.unshift({
      id: Date.now(),
      teacherId: teacher.id,
      mosqueId: teacher.mosqueId,
      msg: `📅 جدول توقيت — ${teacher.name} / ${teacher.mosqueName ?? myMosque?.name}`,
      time: date,
      read: false,
      type: 'schedule',
    });
    sst('adminNotifs', an);

    // ── إشعار أولياء الأمور ──
    const gn = gst<Notif[]>('guardianNotifs', []);
    gn.unshift({
      id: Date.now() + 1,
      teacherId: teacher.id,
      msg: `📅 المؤطر ${teacher.name} أرسل جدول الحصص الجديد`,
      time: date,
      read: false,
    });
    sst('guardianNotifs', gn);

    show('✅ تم الإرسال للأدمن وأولياء الأمور');
  };

  const resetSchedule = () => {
    persistDraft(rows, false, '');
    setSent(false);
    setSentDate('');
  };

  // ── بناء الجدول الأسبوعي ──
  const byDay: Record<string, ScheduleRow[]> = {};
  DAYS_ORDER.forEach(d => (byDay[d] = []));
  rows.forEach(r => { if (byDay[r.day]) byDay[r.day].push(r); });
  const maxRows = Math.max(1, ...Object.values(byDay).map(a => a.length));

  return (
    <div style={{ padding: '14px', direction: 'rtl' }}>

      {/* ══ شريط الفصول ══ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {SEMESTERS.map(s => (
          <button
            key={s.id}
            onClick={() => setSem(s.id as 1 | 2 | 3)}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: `1.5px solid ${sem === s.id ? 'var(--g)' : 'var(--brd)'}`,
              background: sem === s.id ? 'var(--g)' : 'var(--card)',
              color: sem === s.id ? '#fff' : 'var(--txt2)',
              cursor: 'pointer',
              fontFamily: 'Cairo,sans-serif',
              fontSize: 12,
              fontWeight: 700,
              transition: 'all 0.2s',
              textAlign: 'center',
            }}
          >
            <div>{s.label}</div>
            <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 400 }}>{s.range}</div>
          </button>
        ))}
      </div>

      {/* ══ إشعار الإرسال ══ */}
      {sent && (
        <div style={{
          background: '#f0fdf4',
          border: '2px solid #86efac',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#2d8a48', fontSize: 13 }}>
              تم إرسال الجدول للأدمن وأولياء الأمور
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{sentDate}</div>
          </div>
          <button
            onClick={resetSchedule}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--brd)',
              background: 'var(--gp)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'Cairo,sans-serif',
              color: 'var(--txt)',
            }}
          >تعديل</button>
        </div>
      )}

      {/* ══ نموذج إضافة حصة ══ */}
     
        <div style={{
          background: 'var(--card)',
          border: '1.5px solid var(--brd)',
          borderRadius: 12,
          padding: '14px',
          marginBottom: 14,
          boxShadow: 'var(--sh)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--g)', marginBottom: 10 }}>
            ➕ إضافة حصة جديدة
          </div>

          {/* اليوم */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: 'var(--txt3)', display: 'block', marginBottom: 4 }}>اليوم</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAYS_AR.map(d => (
                <button
                  key={d}
                  onClick={() => setNewDay(d)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 16,
                    border: `1.5px solid ${newDay === d ? 'var(--g)' : 'var(--brd)'}`,
                    background: newDay === d ? 'var(--g)' : 'transparent',
                    color: newDay === d ? '#fff' : 'var(--txt2)',
                    cursor: 'pointer',
                    fontFamily: 'Cairo,sans-serif',
                    fontSize: 12,
                    fontWeight: newDay === d ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >{d}</button>
              ))}
            </div>
          </div>

          {/* الوقت */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 110 }}>
              <label style={{ fontSize: 12, color: 'var(--txt3)', display: 'block', marginBottom: 4 }}>من</label>
              <input
                type="time"
                value={newStart}
                onChange={e => setNewStart(e.target.value)}
                className="sinp"
                style={{ width: '100%', fontFamily: 'Cairo,sans-serif' }}
              />
            </div>
            <div style={{ paddingTop: 22, color: 'var(--txt3)', fontSize: 16 }}>—</div>
            <div style={{ flex: 1, minWidth: 110 }}>
              <label style={{ fontSize: 12, color: 'var(--txt3)', display: 'block', marginBottom: 4 }}>إلى</label>
              <input
                type="time"
                value={newEnd}
                onChange={e => setNewEnd(e.target.value)}
                className="sinp"
                style={{ width: '100%', fontFamily: 'Cairo,sans-serif' }}
              />
            </div>
          </div>

          {addErr && (
            <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{addErr}</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
<button onClick={addRow} className="btn btn-gold" style={{ flex: 2 }}>              ➕ إضافة الحصة
            </button>
            {rows.length > 0 && (
              <button onClick={saveDraft} className="btn btn-gold" style={{ flex: 1 }}>
                💾 حفظ مسودة
              </button>
            )}
          </div>
        </div>
     
      {/* ══ الجدول الأسبوعي ══ */}
      <div style={{
        background: 'var(--card)',
        border: '1.5px solid var(--brd)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: 'var(--sh)',
      }}>
        <div style={{
          background: 'var(--g)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>جدول التوقيت الأسبوعي</span>
          {sent && (
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 11,
              borderRadius: 10,
              padding: '2px 10px',
            }}>تم الإرسال ✓</span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: 420,
            direction: 'rtl',
          }}>
            <thead>
              <tr>
                {DAYS_ORDER.map(d => (
                  <th
                    key={d}
                    style={{
                      border: '1px solid var(--brd)',
                      padding: '10px 6px',
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: 'center',
                      background: 'var(--gp)',
                    color: 'var(--txt)',
                    }}
                  >{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {DAYS_ORDER.map(d => {
                    const cell = byDay[d][rowIdx];
                    return (
                    <td key={d} style={{
  border:'1px solid var(--brd)',
  padding:'4px',
  verticalAlign:'top',
  width: `${100/7}%`,
}}>
                        {cell && (
                          <SessionPill
                            row={cell}
                            onRemove={!sent ? () => removeRow(cell.id) : undefined}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--txt3)', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            لم تضف حصة بعد
          </div>
        )}
      </div>
{!sent && rows.length > 0 && (
  <button
    onClick={sendToAll}
    className="btn btn-gold"
    style={{ width: '100%', marginTop: 12, fontSize: 14, padding: '12px' }}
  >
    📤 إرسال الجدول للأدمن وولي الأمر
  </button>
)}

      {toast && <div className="toast" style={{ fontSize: 12 }}>{toast}</div>}
    </div>
  );
}