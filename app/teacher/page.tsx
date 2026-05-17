'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import type { Teacher, Student, Mosque, AppUser, HifzRecord, SemEval, ScheduleRow, SentSchedule, Notif } from '../../types';
import ScheduleTab from './ScheduleTab';
import { supabase } from '../../lib/supabase';

let teachers:   Teacher[] = [];
let dbStudents: Student[] = [];
let mosques:    Mosque[]  = [];

function gst<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }
function sst<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new StorageEvent('storage', { key: k })); }

function useSupabaseData() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      supabase.from('teachers').select('*').order('id'),
      supabase.from('students').select('*').order('id'),
      supabase.from('mosques').select('*').order('id'),
    ]).then(([{ data: tData }, { data: sData }, { data: mData }]) => {
      if (tData) teachers   = tData.map((t: any) => ({ id:t.id, name:t.name, rank:t.rank||'', role:t.role||'موظف', dob:t.dob||'', education:t.education||'', generation:t.generation||'', phone:t.phone||'', municipality:t.municipality||'الأغواط', mosqueId:t.mosque_id||0, mosqueName:t.mosque_name||'' }));
      if (sData) dbStudents = sData.map((s: any) => ({ id:s.id, name:s.name, fatherName:s.father_name||'', dob:s.dob||'', gender:s.gender||'ذكر', teacherId:s.teacher_id||0, teacherName:s.teacher_name||'', mosqueId:s.mosque_id||0, mosqueName:s.mosque_name||'', surah:s.surah||'', part:s.part||'', grade:s.grade||'', progress:s.progress||0 }));
      if (mData) mosques    = mData.map((m: any) => ({ id:m.id, name:m.name, municipality:m.municipality||'الأغواط', imam:m.imam||'', teachersCount:m.teachers_count||0, studentsCount:m.students_count||0, progress:m.progress||0 }));
      setReady(true);
    });
  }, []);
  return ready;
}

const SEMESTERS = [
  { id:1, label:'الفصل الأول',  range:'جانفي – أفريل' },
  { id:2, label:'الفصل الثاني', range:'ماي – أوت'     },
  { id:3, label:'الفصل الثالث', range:'سبتمبر – ديسمبر' },
] as const;

// أيام الدراسة لكل فصل
const SEM_DAYS: Record<number, string[]> = {
  1: ['الاحد','الاربعاء','السبت'],
  2: ['الاثنين','الخميس'],
  3: ['الثلاثاء','الجمعة'],
};
const SEM_MONTHS: Record<number, string[]> = {
  1: ['جانفي','فيفري','مارس','أفريل'],
  2: ['ماي','جوان','جويلية','أوت'],
  3: ['سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
};

const DAYS   = ['الاحد','الاثنين','الثلاثاء','الاربعاء','الخميس','الجمعة','السبت'];
const DAYS_ORDER = ['السبت','الجمعة','الخميس','الاربعاء','الثلاثاء','الاثنين','الاحد'];
const GRADES = ['ممتاز','جيد جداً','جيد','متوسط','ضعيف'];
const PARTS  = ['ثمن','ربع','نصف','ثلاثة أرباع','حزب','حزبان'];

// تحويل التقييم إلى نسبة مئوية
function gradeToPercent(grade: string): number {
  const map: Record<string,number> = { 'ممتاز':90, 'جيد جداً':80, 'جيد':70, 'متوسط':50, 'ضعيف':30 };
  return map[grade] ?? 60;
}

function Ring({ pct, size=56 }: { pct:number; size?:number }) {
  const r=(size-8)/2, c=2*Math.PI*r, off=c-(pct/100)*c;
  const col=pct>=70?'#1e6b35':pct>=50?'#b8872a':'#dc2626';
  return (
    <svg width={size} height={size} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--brd)" strokeWidth={7}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={7}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        style={{fontSize:10,fontWeight:700,fill:col,fontFamily:'Cairo,sans-serif'}}>{pct}%</text>
    </svg>
  );
}

function Modal({ title, onClose, children, wide }: { title:string; onClose:()=>void; children:React.ReactNode; wide?:boolean }) {
  return (
    <div className="mbg">
      <div className="mbox" style={wide?{maxWidth:560}:{}}>
        <div className="mhd"><span className="mtit">{title}</span><button className="mcls" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}
function F({ label, children }: { label:string; children:React.ReactNode }) {
  return <div className="fld"><label>{label}</label>{children}</div>;
}
function GBadge({ g }: { g:string }) {
  const cls = g==='ممتاز'?'bdg-g':g==='جيد جداً'||g==='جيد'?'bdg-gld':'bdg-r';
  return <span className={`bdg ${cls}`}>{g}</span>;
}
function useToast() {
  const [t,sT] = useState('');
  const show = (m:string) => { sT(m); setTimeout(()=>sT(''),2500); };
  return { toast:t, show };
}
// ══════════════════════════════════════════════════════════
//  STAT CARDS — نفس تصميم الأدمن
// ══════════════════════════════════════════════════════════
function StatCards({ myStud }: { myStud: Student[] }) {
  const total      = myStud.length;
  const advanced   = myStud.filter(s => s.progress >= 70).length;
  const needFollow = myStud.filter(s => s.progress < 40).length;

  return (
    <div className="stats" style={{ padding: '60px 40px 12px', gap: 19 }}>
      <div className="stat">
        <img src="/student.png" alt="" className="ico"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div className="stat-info">
          <div className="stat-lbl">اجمالي الطلبة</div>
          <div className="stat-val">{total}</div>
        </div>
      </div>

      <div className="stat">
        <img src="/teacher.png" alt="" className="ico"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div className="stat-info">
          <div className="stat-lbl">الطلبة المتقدمون</div>
          <div className="stat-val" style={{ color: 'var(--g)' }}>{advanced}</div>
        </div>
      </div>

      <div className="stat">
        <img src="/mosque.png" alt="" className="ico"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div className="stat-info">
          <div className="stat-lbl">يحتاجون متابعة</div>
          <div className="stat-val" style={{ color: needFollow > 0 ? '#dc2626' : 'var(--g)' }}>
            {needFollow}
          </div>
        </div>
      </div>
    </div>
  );
}
// ══════════════════════════════════════════════════════════
//  SUB NAV — نفس تصميم تاب الأدمن (نظرة عامة / المؤطرون / الطلبة)
// ══════════════════════════════════════════════════════════
const SUB_TABS = [
  { id: 'students',   label: 'الطلبة'       },
  { id: 'attendance', label: 'الحضور'       },
  { id: 'schedule',   label: 'جدول التوقيت' },
];
function SubNav({ active, setActive }: { active: string; setActive: (v: string) => void }) {
  return (
<div className="stats" style={{ padding: '40px 40px 12px', gap: 19, marginBottom: 8 }}>   
     {SUB_TABS.map(t => (
        <button
          key={t.id}
          className={`pill ${active === t.id ? 'on' : ''}`}
          onClick={() => setActive(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
// ══════════════════════════════════════════════════════════
//  TAB: الطلبة
// ══════════════════════════════════════════════════════════
type ModalType = 'hifz'|'eval'|'add'|null;

function StudentsTab({ teacher, myStud, setMyStud }: { teacher:Teacher; myStud:Student[]; setMyStud:(s:Student[])=>void }) {
  const [sem, setSem]           = useState(1);
  const [search, setSearch]     = useState('');
  const [selSt, setSelSt]       = useState<Student|null>(null);
  const [modal, setModal]       = useState<ModalType>(null);
  const [hifzForm, setHifzForm] = useState({ surah:'', part:'', grade:'ممتاز', notes:'' });
  const [evalForm, setEvalForm] = useState({
    surah:'', part:'', grade:'ممتاز', attendance:'', notes:'',
    isKhatm:false, khatmYear:new Date().getFullYear().toString(), khatmType:'ختم كامل', khatmNote:''
  });
  const [addForm, setAddForm] = useState({ name:'', fatherName:'', dob:'', gender:'أنثى' as 'ذكر'|'أنثى', phone:'', surah:'', grade:'جيد', progress:'60' });
  const [hifzData, setHifzData] = useState<Record<string,HifzRecord[]>>({});
  const [evalData, setEvalData] = useState<Record<string,SemEval>>({});
  const [newGuardianInfo, setNewGuardianInfo] = useState<{username:string;password:string;studentName:string}|null>(null);
  const { toast, show } = useToast();

  useEffect(() => {
    const load = () => { setHifzData(gst('hifzRecords',{})); setEvalData(gst('semEvals',{})); };
    load(); window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const getHifz = (sid:number): HifzRecord[] => hifzData[`${sid}_${sem}`]||[];
  const getEval = (sid:number): SemEval|null  => evalData[`${sid}_${sem}`]||null;

  const saveEval = () => {
    if (!selSt) return;
    const key = `${selSt.id}_${sem}`;
    const updated = { ...evalData, [key]:{ ...evalForm, date:new Date().toLocaleDateString('ar'), teacherId:teacher.id, semId:sem, teacherName:teacher.name } };
    sst('semEvals', updated); setEvalData(updated);
    const now = new Date().toLocaleString('ar');
    const semLbl = SEMESTERS.find(s=>s.id===sem)?.label||'';
    // إشعار ولي الأمر
    const gn = gst<Notif[]>('guardianNotifs', []);
    gn.unshift({ id:Date.now(), studentId:selSt.id, msg:`📋 تقرير ${semLbl} لـ${selSt.name}: ${evalForm.grade}`, time:now, read:false });
    sst('guardianNotifs', gn);
    // إشعار الأدمن
    const an = gst<Notif[]>('adminNotifs', []);
    const alreadyNotified = an.some(n => n.teacherId===teacher.id && n.msg?.includes(`تقييمات ${semLbl}`));
    if (!alreadyNotified) {
      an.unshift({ id:Date.now()+1, teacherId:teacher.id, mosqueId:teacher.mosqueId,
        msg:`📋 تقييم ${semLbl} — ${teacher.name} / ${teacher.mosqueName}`, time:now, read:false });
      sst('adminNotifs', an);
    }
    if (evalForm.isKhatm && selSt) {
      const khatmRecs = gst<any[]>('khatmRecords', []);
      const alreadyExists = khatmRecs.some(k => k.studentId===selSt.id && k.year===evalForm.khatmYear);
      if (!alreadyExists) {
        khatmRecs.unshift({ id:Date.now(), studentId:selSt.id, studentName:selSt.name, teacherId:teacher.id, teacherName:teacher.name, mosqueId:teacher.mosqueId, mosqueName:teacher.mosqueName, year:evalForm.khatmYear, khatmType:evalForm.khatmType, semId:sem, date:new Date().toLocaleDateString('ar'), notes:evalForm.khatmNote });
        sst('khatmRecords', khatmRecs);
        const anK = gst<Notif[]>('adminNotifs', []);
        anK.unshift({ id:Date.now()+2, teacherId:teacher.id, mosqueId:teacher.mosqueId, msg:`🏆 خاتم جديد: ${selSt.name} — ${evalForm.khatmType} ${evalForm.khatmYear} / ${teacher.mosqueName}`, time:now, read:false });
        sst('adminNotifs', anK);
      }
    }
    show('✅ تم إرسال التقييم للأدمن وولي الأمر'); setModal(null);
    setEvalForm({surah:'',part:'',grade:'ممتاز',attendance:'',notes:'',isKhatm:false,khatmYear:new Date().getFullYear().toString(),khatmType:'ختم كامل',khatmNote:''});
  };

  const saveHifz = () => {
    if (!selSt||!hifzForm.surah) { show('⚠️ السورة مطلوبة'); return; }
    const key = `${selSt.id}_${sem}`;
    const rec: HifzRecord = { ...hifzForm, id:Date.now(), date:new Date().toLocaleDateString('ar') };
    const updated = { ...hifzData, [key]:[...(hifzData[key]||[]),rec] };
    sst('hifzRecords', updated); setHifzData(updated);
    const now = new Date().toLocaleString('ar');
    const gn = gst<Notif[]>('guardianNotifs', []);
    gn.unshift({ id:Date.now(), studentId:selSt.id, msg:`📖 تم تسجيل حفظ جديد لـ${selSt.name}: ${hifzForm.surah} — ${hifzForm.part} (${hifzForm.grade})`, time:now, read:false });
    sst('guardianNotifs', gn);
    const an = gst<Notif[]>('adminNotifs', []);
    an.unshift({ id:Date.now()+1, teacherId:teacher.id, mosqueId:teacher.mosqueId, msg:`📖 المؤطر ${teacher.name} سجّل حفظاً جديداً`, time:now, read:false });
    sst('adminNotifs', an);
    show('✅ تم تسجيل الحفظ'); setModal(null); setHifzForm({surah:'',part:'',grade:'ممتاز',notes:''});
  };
const saveNewStudent = async () => {
  if (!addForm.name||!addForm.fatherName) { show('⚠️ الاسم واسم الأب مطلوبان'); return; }
  const newId = Date.now();
  const newS: Student = { id:newId, name:addForm.name, fatherName:addForm.fatherName, dob:addForm.dob, gender:addForm.gender, teacherId:teacher.id, teacherName:teacher.name, mosqueId:teacher.mosqueId, mosqueName:teacher.mosqueName, phone:addForm.phone, surah:addForm.surah, part:'ثمن', grade:addForm.grade, progress:parseInt(addForm.progress)||60 };
  
  setMyStud([...myStud, newS]);
  const dyn = gst<Student[]>('dynamicStudents', []);
  sst('dynamicStudents', [...dyn, newS]);

  const baseName = addForm.fatherName.replace(/\s+/g,'').slice(0,8);
  const wUN = `wali_${baseName}${newId%1000}`;
  const wPW = 'wali'+(newId%10000);
  const dynU = gst<AppUser[]>('dynamicUsers', []);
  const existIdx = dynU.findIndex(u=>u.role==='guardian'&&u.name.includes(addForm.fatherName));
  
  if (existIdx>=0) {
    const ex=dynU[existIdx];
    dynU[existIdx]={...ex,studentIds:[...(ex.studentIds||[]),newId]};
    setNewGuardianInfo({username:ex.username,password:ex.password,studentName:addForm.name});
    // تحديث في Supabase
    await supabase.from('app_users')
      .update({ student_ids: dynU[existIdx].studentIds })
      .eq('username', ex.username);
  } else {
    dynU.push({id:newId+2000,username:wUN,password:wPW,role:'guardian',name:`ولي أمر ${addForm.name}`,studentIds:[newId]});
    setNewGuardianInfo({username:wUN,password:wPW,studentName:addForm.name});
    // حفظ في Supabase
    await supabase.from('app_users').insert({
      id: newId+2000,
      username: wUN,
      password: wPW,
      role: 'guardian',
      name: `ولي أمر ${addForm.name}`,
      student_ids: [newId],
    });
  }
  
  sst('dynamicUsers', dynU);
  const an = gst<Notif[]>('adminNotifs', []);
  an.unshift({ id:Date.now(), teacherId:teacher.id, msg:`🎓 طالب جديد: ${addForm.name} — ${teacher.name} / ${teacher.mosqueName}`, time:new Date().toLocaleString('ar'), read:false });
  sst('adminNotifs', an);
  setModal(null);
  setAddForm({name:'',fatherName:'',dob:'',gender:'أنثى',phone:'',surah:'',grade:'جيد',progress:'60'});
};
  const deleteStudent = (id:number) => {
    setMyStud(myStud.filter(st=>st.id!==id));
    const dyn = gst<Student[]>('dynamicStudents',[]);
    sst('dynamicStudents', dyn.filter(st=>st.id!==id));
    show('🗑 تم حذف الطالب');
  };

  const filtered = myStud.filter(s=>s.name.includes(search)||s.fatherName?.includes(search));

  return (
    <div className="main pgin" style={{padding:'14px'}}>
      {/* فصول */}
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {SEMESTERS.map(s=>(
          <button key={s.id} onClick={()=>setSem(s.id)}
            style={{padding:'6px 14px',borderRadius:20,border:'1.5px solid',fontSize:12,cursor:'pointer',fontFamily:'Cairo,sans-serif',transition:'all 0.2s',
              background:sem===s.id?'var(--g)':'var(--card)',color:sem===s.id?'#fff':'var(--txt2)',borderColor:sem===s.id?'var(--g)':'var(--brd)'}}>
            <div style={{fontWeight:700}}>{s.label}</div>
            <div style={{fontSize:10,opacity:0.8}}>{s.range}</div>
          </button>
        ))}
      </div>

      {/* شريط البحث + إضافة */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <div className="sw" style={{flex:1,minWidth:160,marginBottom:0}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} className="sinp" placeholder="البحث عن طالب..."/>
          <img src="/Searchh.png" className="sico ico"/>
        </div>
        <button onClick={()=>setModal('add')} className="btn btn-gold btn-sm">+ اضافة طالب</button>
      </div>

      <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:'var(--g)',display:'flex',alignItems:'center',gap:6}}>
        قائمة الطلبة ({filtered.length})
      </div>

      {filtered.map(s=>{
        const hList=getHifz(s.id), lastH=hList[hList.length-1], ev=getEval(s.id);
        const displayPct = ev ? gradeToPercent(ev.grade) : 0;
        return (
          <div key={s.id} style={{background:'var(--card)',border:'2px solid var(--brd)',borderRadius:12,padding:'12px 14px',marginBottom:10,boxShadow:'var(--sh)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',direction:'rtl'}}>
            <Ring pct={displayPct} size={56}/>
            <div style={{flex:1,minWidth:160,textAlign:'right'}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{s.name}</div>
              <div style={{fontSize:12,color:'var(--txt3)',marginBottom:1}}>ولي الأمر: {s.fatherName}</div>
              {(s as any).phone&&<div style={{fontSize:11,color:'var(--txt3)',marginBottom:1}}>📞 {(s as any).phone}</div>}
              {s.dob&&<div style={{fontSize:11,color:'var(--txt3)',marginBottom:1}}>📅 {s.dob}</div>}
              {ev&&<div style={{marginTop:4}}><GBadge g={ev.grade}/></div>}
              {lastH&&<div style={{fontSize:11,color:'var(--g)',marginTop:4}}>📖 {lastH.surah} — {lastH.part}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,minWidth:110}}>
              <button onClick={()=>{setSelSt(s);setEvalForm(ev?{surah:ev.surah||'',part:ev.part||'',grade:ev.grade||'ممتاز',attendance:ev.attendance||'',notes:ev.notes||'',isKhatm:false,khatmYear:new Date().getFullYear().toString(),khatmType:'ختم كامل',khatmNote:''}:{surah:'',part:'',grade:'ممتاز',attendance:'',notes:'',isKhatm:false,khatmYear:new Date().getFullYear().toString(),khatmType:'ختم كامل',khatmNote:''});setModal('eval');}}
style={{background:'var(--gp)',color:'var(--g)',border:'2px solid var(--g)',borderRadius:8,padding:'7px 10px',fontFamily:'Cairo,sans-serif',fontSize:12,cursor:'pointer',fontWeight:700,textAlign:'center'}}>
        📋 تقييم الفصل
              </button>
              <button onClick={()=>deleteStudent(s.id)}
                style={{background:'#fef2f2',color:'#dc2626',border:'1.5px solid #fca5a5',borderRadius:8,padding:'7px 10px',fontFamily:'Cairo,sans-serif',fontSize:12,cursor:'pointer',fontWeight:700}}>
                حذف
              </button>
            </div>
          </div>
        );
      })}
      {filtered.length===0&&<div style={{textAlign:'center',color:'var(--txt3)',padding:60}}>لا يوجد طلبة</div>}

      {/* Modals */}
      {modal==='eval'&&selSt&&(
        <Modal title={`تقييم ${SEMESTERS.find(s=>s.id===sem)?.label} — ${selSt.name}`} onClose={()=>setModal(null)} wide>
          <div style={{background:'var(--gp)',borderRadius:8,padding:'8px 14px',marginBottom:12,fontSize:12,color:'var(--txt3)'}}>📤 يُرسل لولي الأمر والمسؤول تلقائياً</div>
          <F label="السورة المحفوظة"><input className="sinp" style={{paddingLeft:14}} placeholder="مثال: سورة البقرة" value={evalForm.surah} onChange={e=>setEvalForm(p=>({...p,surah:e.target.value}))}/></F>
          <F label="المقدار الإجمالي">
            <select className="sel" style={{width:'100%'}} value={evalForm.part} onChange={e=>setEvalForm(p=>({...p,part:e.target.value}))}>
              <option value="">اختر</option>{PARTS.map(q=><option key={q}>{q}</option>)}
            </select>
          </F>
          <F label="التقييم العام">
            <select className="sel" style={{width:'100%'}} value={evalForm.grade} onChange={e=>setEvalForm(p=>({...p,grade:e.target.value}))}>
              {GRADES.map(g=><option key={g}>{g}</option>)}
            </select>
          </F>
          <F label="نسبة الحضور (%)"><input className="sinp" style={{paddingLeft:14}} type="number" min="0" max="100" value={evalForm.attendance} onChange={e=>setEvalForm(p=>({...p,attendance:e.target.value}))}/></F>
          <F label="ملاحظات المؤطر"><textarea className="sinp" style={{paddingLeft:14,height:70,resize:'vertical'}} value={evalForm.notes} onChange={e=>setEvalForm(p=>({...p,notes:e.target.value}))}/></F>
          {/* ختم القرآن */}
          <div style={{background:evalForm.isKhatm?'#f0fdf4':'var(--gp)',border:`1.5px solid ${evalForm.isKhatm?'#86efac':'var(--brd)'}`,borderRadius:10,padding:'10px 14px',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:evalForm.isKhatm?10:0}}>
              <div onClick={()=>setEvalForm(p=>({...p,isKhatm:!p.isKhatm}))}
                style={{width:22,height:22,borderRadius:5,cursor:'pointer',flexShrink:0,border:`1.5px solid ${evalForm.isKhatm?'#2d8a48':'var(--brd)'}`,background:evalForm.isKhatm?'#2d8a48':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13,fontWeight:700}}>
                {evalForm.isKhatm?'✓':''}
              </div>
              <span style={{fontSize:14,fontWeight:700,color:evalForm.isKhatm?'#14532d':'var(--txt)'}}>🏆 ختم القرآن الكريم</span>
            </div>
            {evalForm.isKhatm&&(
              <div>
                <div style={{fontSize:11,color:'#166534',marginBottom:8}}>سيُسجَّل الطالب في قائمة خاتمي القرآن تلقائياً</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  <F label="سنة الختم">
                    <select className="sel" style={{width:'100%'}} value={evalForm.khatmYear} onChange={e=>setEvalForm(p=>({...p,khatmYear:e.target.value}))}>
                      {['2026','2025','2024','2023'].map(y=><option key={y}>{y}</option>)}
                    </select>
                  </F>
                  <F label="نوع الختم">
                    <select className="sel" style={{width:'100%'}} value={evalForm.khatmType} onChange={e=>setEvalForm(p=>({...p,khatmType:e.target.value}))}>
                      {['ختم كامل','ختم جزء عمة','ختم الأحزاب الأخيرة'].map(t=><option key={t}>{t}</option>)}
                    </select>
                  </F>
                </div>
                <F label="ملاحظة"><input className="sinp" style={{paddingLeft:14,width:'100%'}} placeholder="مثال: أتم الحفظ بتميز" value={evalForm.khatmNote} onChange={e=>setEvalForm(p=>({...p,khatmNote:e.target.value}))}/></F>
              </div>
            )}
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:10}}>
            <button className="btn btn-gold" onClick={()=>setModal(null)}>إلغاء</button>
            <button className="btn btn-solid" onClick={saveEval}>📤 إرسال التقييم</button>
          </div>
        </Modal>
      )}
      {modal==='hifz'&&selSt&&(
        <Modal title={`تسجيل حفظ — ${selSt.name}`} onClose={()=>setModal(null)}>
          <F label="السورة *"><input className="sinp" style={{paddingLeft:14}} placeholder="مثال: سورة البقرة" value={hifzForm.surah} onChange={e=>setHifzForm(p=>({...p,surah:e.target.value}))}/></F>
          <F label="المقدار المحفوظ">
            <select className="sel" style={{width:'100%'}} value={hifzForm.part} onChange={e=>setHifzForm(p=>({...p,part:e.target.value}))}>
              <option value="">اختر</option>{PARTS.map(q=><option key={q}>{q}</option>)}
            </select>
          </F>
          <F label="التقييم">
            <select className="sel" style={{width:'100%'}} value={hifzForm.grade} onChange={e=>setHifzForm(p=>({...p,grade:e.target.value}))}>
              {GRADES.map(g=><option key={g}>{g}</option>)}
            </select>
          </F>
          <F label="ملاحظات"><input className="sinp" style={{paddingLeft:14}} value={hifzForm.notes} onChange={e=>setHifzForm(p=>({...p,notes:e.target.value}))}/></F>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:10}}>
            <button className="btn btn-gold" onClick={()=>setModal(null)}>إلغاء</button>
            <button className="btn btn-solid" onClick={saveHifz}>💾 حفظ</button>
          </div>
        </Modal>
      )}
      {modal==='add'&&(
        <Modal title="إضافة طالب جديد" onClose={()=>setModal(null)} wide>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <F label="اسم الطالب"><input className="sinp" style={{paddingLeft:16}} value={addForm.name} onChange={e=>setAddForm(p=>({...p,name:e.target.value}))}/></F>
            <F label="اسم الأب"><input className="sinp" style={{paddingLeft:16}} value={addForm.fatherName} onChange={e=>setAddForm(p=>({...p,fatherName:e.target.value}))}/></F>
            <F label="تاريخ الميلاد"><input className="sinp" style={{paddingLeft:16}} type="date" value={addForm.dob} onChange={e=>setAddForm(p=>({...p,dob:e.target.value}))}/></F>
            <F label="الجنس">
              <select className="sel" style={{width:'100%'}} value={addForm.gender} onChange={e=>setAddForm(p=>({...p,gender:e.target.value as 'ذكر'|'أنثى'}))}>
                <option>ذكر</option><option>أنثى</option>
              </select>
            </F>
            <F label="رقم هاتف الأب"><input className="sinp" style={{paddingLeft:16}} placeholder="06 XX XX XX XX" value={addForm.phone} onChange={e=>setAddForm(p=>({...p,phone:e.target.value}))}/></F>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}>
            <button className="btn btn-gold" onClick={()=>setModal(null)}>إلغاء</button>
            <button className="btn btn-solid" onClick={saveNewStudent}>✅ حفظ وإنشاء الحساب</button>
          </div>
        </Modal>
      )}
      {newGuardianInfo&&(
        <Modal title="✅ تم إنشاء حساب ولي الأمر" onClose={()=>setNewGuardianInfo(null)}>
          <div style={{textAlign:'center',padding:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>طالب: {newGuardianInfo.studentName}</div>
            <div style={{background:'#f0fdf4',border:'2px solid #86efac',borderRadius:10,padding:'16px 20px',margin:'16px 0',textAlign:'right'}}>
              <div style={{marginBottom:8,fontSize:13}}><span style={{color:'var(--txt3)'}}>اسم المستخدم: </span><strong style={{fontFamily:'monospace',fontSize:15,color:'#2d8a48'}}>{newGuardianInfo.username}</strong></div>
              <div style={{fontSize:13}}><span style={{color:'var(--txt3)'}}>كلمة المرور: </span><strong style={{fontFamily:'monospace',fontSize:15,color:'#2d8a48'}}>{newGuardianInfo.password}</strong></div>
            </div>
            <button className="btn btn-solid" style={{width:'100%'}} onClick={()=>{setNewGuardianInfo(null);show('✅ تمت الإضافة بنجاح');}}>حسناً، تم الحفظ</button>
          </div>
        </Modal>
      )}
      {toast&&<div className="toast" style={{fontSize:12}}>{toast}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  TAB: الحضور — جدول شهري بالأيام الدراسية
// ══════════════════════════════════════════════════════════
function AttendanceTab({ teacher, myStud }: { teacher: Teacher; myStud: Student[] }) {
  const [sem, setSem]     = useState<1|2|3>(1);
  const [month, setMonth] = useState(0);
  const [attData, setAttData] = useState<Record<string, { teacherId:number; present:number[]; date?:string }>>({});
  const { toast, show } = useToast();

  useEffect(() => {
    const load = () => setAttData(gst('attendance', {}));
    load(); window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);
const [days, setDays] = useState<string[]>(SEM_DAYS[sem]);
const months = SEM_MONTHS[sem];

useEffect(() => {
  const load = () => {
    const saved = gst<{rows:{day:string}[];sent:boolean}|null>(
      `sentSchedules_t${teacher.id}_s${sem}`, null
    );
    if (saved?.rows?.length) {
      setDays([...new Set(saved.rows.map(r => r.day))]);
    } else {
      setDays(SEM_DAYS[sem]);
    }
  };
  load();
  window.addEventListener('storage', load);
  return () => window.removeEventListener('storage', load);
}, [sem, teacher.id]);

  const cols: { week:number; day:string; key:string }[] = [];
  for (let w=1; w<=4; w++) {
    days.forEach(d => {
      cols.push({ week:w, day:d, key:`w${w}_${d}` });
    });
  }

  const getCellState = (sid:number, colKey:string): 'present'|'absent'|'' => {
    const k = `att_${teacher.id}_sem${sem}_m${month}_${colKey}`;
    const rec = attData[k];
    if (!rec) return '';
    return rec.present?.includes(sid) ? 'present' : rec.present !== undefined ? 'absent' : '';
  };

  const toggleCell = (sid:number, colKey:string) => {
    const k = `att_${teacher.id}_sem${sem}_m${month}_${colKey}`;
    const cur = attData[k];
    let newPresent: number[];
    if (!cur) {
      newPresent = [sid];
    } else if (cur.present?.includes(sid)) {
      newPresent = cur.present.filter(x=>x!==sid);
    } else {
      newPresent = [...(cur.present||[]), sid];
    }
    const updated = { ...attData, [k]:{ teacherId:teacher.id, present:newPresent, date:new Date().toLocaleDateString('ar') } };
    sst('attendance', updated);
    setAttData(updated);
  };

  const sendToGuardian = () => {
    const now = new Date().toLocaleString('ar');
    const semLbl = SEMESTERS.find(s=>s.id===sem)?.label || '';
    const monthName = months[month];
    myStud.forEach(s => {
      let presentCount = 0, totalCount = 0;
      cols.forEach(col => {
        const k = `att_${teacher.id}_sem${sem}_m${month}_${col.key}`;
        const rec = attData[k];
        if (rec) { totalCount++; if (rec.present?.includes(s.id)) presentCount++; }
      });
      const gn = gst<Notif[]>('guardianNotifs', []);
      gn.unshift({ id: Date.now()+s.id, studentId: s.id,
        msg: `📊 تقرير حضور ${s.name} — ${semLbl} / شهر ${monthName}\nأيام الدراسة: ${days.join(' · ')}\nالحاضر: ${presentCount} / ${totalCount}`,
        time: now, read: false });
      sst('guardianNotifs', gn);
    });
    const an = gst<Notif[]>('adminNotifs', []);
    an.unshift({ id:Date.now(), teacherId:teacher.id, mosqueId:teacher.mosqueId,
      msg:`📋 ${teacher.name} أرسل سجل حضور ${semLbl} / شهر ${monthName}`,
      time:now, read:false, type:'attendance' });
    sst('adminNotifs', an);
    show(`✅ تم الإرسال — ${semLbl} / ${monthName}`);
  };

  const presentTotal = (sid:number) => {
    let p=0, t=0;
    cols.forEach(col => {
      const k = `att_${teacher.id}_sem${sem}_m${month}_${col.key}`;
      const rec = attData[k];
      if (rec) { t++; if (rec.present?.includes(sid)) p++; }
    });
    return { p, t };
  };

  return (
    <div className="pgin" style={{padding:'14px'}}>
{/* ── شريط التحكم الموحد ── */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:40,flexWrap:'wrap',direction:'rtl'}}>

        {/* فلتر الفصل */}
        <select
          value={sem}
          onChange={e => { setSem(Number(e.target.value) as 1|2|3); setMonth(0); }}
          className="sel"
          style={{minWidth:130}}
        >
          {SEMESTERS.map(s => (
            <option key={s.id} value={s.id}>{s.label} ({s.range})</option>
          ))}
        </select>

        {/* فلتر الشهر */}
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="sel"
          style={{minWidth:100}}
        >
          {months.map((m,i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>

        <div style={{flex:1}}/>

        {/* زر الإرسال */}
        <button onClick={sendToGuardian} className="btn btn-gold btn-sm">
          إرسال لولي الأمر
        </button>
      </div>
      {/* ── الجدول ── */}
      {myStud.length === 0 ? (
        <div style={{textAlign:'center',color:'var(--txt3)',padding:40}}>لا يوجد طلبة</div>
      ) : (
        <div style={{overflowX:'auto',borderRadius:10,border:'1.5px solid var(--brd)',boxShadow:'var(--sh)'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth: 180 + cols.length*44,direction:'rtl'}}>
          <thead>
  {/* صف اسم الأسبوع */}
  <tr>
    <th
      rowSpan={2}
      style={{
        background: 'var(--gp)',
        color: 'var(--g)',
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'right',
        position: 'sticky',
        right: 0,
        zIndex: 2,
        minWidth: 110,
      }}
    >
      الاسم
    </th>

    {[1, 2, 3, 4].map((w) => (
      <th
        key={w}
        colSpan={days.length}
        style={{
          background: 'var(--gp)',
          color: 'var(--g)',
          padding: '6px 4px',
          fontSize: 11,
          fontWeight: 700,
          textAlign: 'center',
          borderLeft: '1px solid var(--brd)',
        }}
      >
        الأسبوع {w}
      </th>
    ))}

    <th
      rowSpan={2}
      style={{
        background: 'var(--gp)',
        color: 'var(--g)',
        padding: '6px 8px',
        fontSize: 11,
        fontWeight: 700,
        textAlign: 'center',
        minWidth: 54,
      }}
    >
      الحضور
    </th>
  </tr>

  {/* صف أسماء الأيام كاملة */}
  <tr>
    {[1, 2, 3, 4].map((w) =>
      days.map((d) => (
        <th
          key={`${w}_${d}`}
          style={{
            background: 'var(--gp)',
            color: 'var(--g)',
            padding: '5px 3px',
            fontSize: 11,
            fontWeight: 600,
            textAlign: 'center',
            minWidth: 44,
            borderLeft: '1px solid var(--brd)',
          }}
        >
          {d}
        </th>
      ))
    )}
  </tr>
</thead>
            <tbody>
              {myStud.map((s,ri) => {
                const { p, t } = presentTotal(s.id);
                const pct = t>0 ? Math.round((p/t)*100) : null;
                return (
                  <tr key={s.id}>
                    <td style={{padding:'7px 12px',fontWeight:600,fontSize:12,textAlign:'right',background: '#fff',position:'sticky',right:0,zIndex:1,borderBottom:'1px solid var(--brd)'}}>{s.name}</td>
                    {cols.map(col => {
                      const st = getCellState(s.id, col.key);
                      return (
                        <td key={col.key} style={{padding:'4px',textAlign:'center',background: '#fff',borderBottom:'1px solid var(--brd)',borderLeft:'1px solid var(--brd)'}}>
                          <div
                            onClick={() => toggleCell(s.id, col.key)}
                            style={{
                              width:32,height:32,borderRadius:6,margin:'auto',cursor:'pointer',
                              display:'flex',alignItems:'center',justifyContent:'center',
                              fontSize:14,fontWeight:700,transition:'all 0.15s',
                              border: st ? 'none' : '1.5px solid var(--brd)',
                              background: st==='present' ? '#1e6b35' : st==='absent' ? '#dc2626' : 'transparent',
                              color: st ? '#fff' : 'var(--txt3)',
                            }}>
                            {st==='present' ? '✓' : st==='absent' ? '✕' : ''}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{padding:'6px 8px',textAlign:'center',background: '#fff',borderBottom:'1px solid var(--brd)'}}>
                      {pct !== null
                        ? <span style={{fontSize:11,fontWeight:700,color:pct>=70?'#1e6b35':pct>=50?'#b8872a':'#dc2626'}}>{pct}%</span>
                        : <span style={{fontSize:10,color:'var(--txt3)'}}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{marginTop:10,fontSize:11,color:'var(--txt3)',display:'flex',gap:14,flexWrap:'wrap'}}>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:14,height:14,borderRadius:3,background:'#1e6b35',display:'inline-block'}}/> حاضر</span>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:14,height:14,borderRadius:3,background:'#dc2626',display:'inline-block'}}/> غائب</span>
        <span style={{color:'var(--txt3)'}}>اضغط للتبديل</span>
      </div>

      {toast && <div className="toast" style={{fontSize:12}}>{toast}</div>}
    </div>
  );
}
// ══════════════════════════════════════════════════════════
//  TAB: جدول التوقيت
// ══════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════
//  MAIN TEACHER PAGE
// ══════════════════════════════════════════════════════════
export default function TeacherPage() {
  const router = useRouter();
  const ready  = useSupabaseData();
  const [tab, setTab]       = useState('st');
  const [subTab, setSubTab] = useState('students');
  const [user, setUser]     = useState<AppUser|null>(null);
  const [myStud, setMyStud] = useState<Student[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.replace('/'); return; }
    const parsed: AppUser = JSON.parse(stored);
    if (parsed.role !== 'teacher') { router.replace('/'); return; }
    setUser(parsed);
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    const loadStudents = () => {
      const dyn = gst<Student[]>('dynamicStudents', []);
      const all = [...dbStudents, ...dyn];
      setMyStud(all.filter(s => s.teacherId === user.teacherId));
    };
    loadStudents();
    window.addEventListener('storage', loadStudents);
    return () => window.removeEventListener('storage', loadStudents);
  }, [ready, user]);

  if (!user || !ready) return null;

  const teacher  = teachers.find(t => t.id === user.teacherId) ?? teachers[1];
  const myMosque = mosques.find(m => m.id === teacher?.mosqueId);

  return (
    <Layout
      tab={tab}
      setTab={setTab}
      user={user}
      subNav={
        <>
          <StatCards myStud={myStud}/>
          <SubNav active={subTab} setActive={setSubTab}/>
        </>
      }
    >
      {subTab==='students'   && <StudentsTab   teacher={teacher} myStud={myStud} setMyStud={setMyStud}/>}
      {subTab==='attendance' && <AttendanceTab teacher={teacher} myStud={myStud}/>}
      {subTab==='schedule'   && <ScheduleTab   teacher={teacher} myMosque={myMosque}/>}
    </Layout>
  );
}