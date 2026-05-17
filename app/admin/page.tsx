'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import type { Mosque, Teacher, Student, AppUser, Notif } from '../../types';
import { supabase } from '../../lib/supabase';

let initialMosques:  Mosque[]  = [];
let initialTeachers: Teacher[] = [];
let initialStudents: Student[] = [];
let _dataPromise: Promise<void> | null = null;

function getDataPromise() {
  if (_dataPromise) return _dataPromise;
  _dataPromise = Promise.all([
    supabase.from('mosques').select('*').order('id'),
    supabase.from('teachers').select('*').order('id'),
    supabase.from('students').select('*').order('id'),
  ]).then(([{ data: mData }, { data: tData }, { data: sData }]) => {
    if (mData) initialMosques  = mData.map((m: any) => ({ id:m.id, name:m.name, municipality:m.municipality, imam:m.imam||'', teachersCount:m.teachers_count||0, studentsCount:m.students_count||0, progress:m.progress||0 }));
    if (tData) initialTeachers = tData.map((t: any) => ({ id:t.id, name:t.name, rank:t.rank||'', role:t.role||'موظف', dob:t.dob||'', education:t.education||'', generation:t.generation||'', phone:t.phone||'', municipality:t.municipality||'الأغواط', mosqueId:t.mosque_id||0, mosqueName:t.mosque_name||'' }));
    if (sData) initialStudents = sData.map((s: any) => ({ id:s.id, name:s.name, fatherName:s.father_name||'', dob:s.dob||'', gender:s.gender||'ذكر', teacherId:s.teacher_id||0, teacherName:s.teacher_name||'', mosqueId:s.mosque_id||0, mosqueName:s.mosque_name||'', surah:s.surah||'', part:s.part||'', grade:s.grade||'', progress:s.progress||0 }));
  }).catch(() => {});
  return _dataPromise;
}

function gst<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }
function sst<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new StorageEvent('storage', { key: k })); }

function useDataReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => { getDataPromise().then(() => setReady(true)); }, []);
  return ready;
}

const DAYS = ['الاحد','الاثنين','الثلاثاء','الاربعاء','الخميس','الجمعة','السبت'];

function Ring({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = (size-8)/2, c = 2*Math.PI*r, off = c-(pct/100)*c;
  const col = pct>=70 ? '#2d8a48' : pct>=40 ? '#b8872a' : '#dc2626';
  return (
    <svg width={size} height={size} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--brd)" strokeWidth={7}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={7}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        style={{fontSize:11,fontWeight:700,fill:col,fontFamily:'Cairo,sans-serif'}}>{pct}%</text>
    </svg>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="mbg">
      <div className="mbox" style={wide ? {maxWidth:600} : {}}>
        <div className="mhd"><span className="mtit">{title}</span><button className="mcls" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="fld"><label>{label}</label>{children}</div>;
}

function useToast() {
  const [toast, setToast] = useState('');
  const show = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  return { toast, show };
}

function AdminNotifBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const load = () => setNotifs(gst<Notif[]>('adminNotifs', []));
    load(); window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);
  const unread = notifs.filter(n => !n.read).length;
  const markRead = () => { const u = notifs.map(n => ({...n, read:true})); sst('adminNotifs', u); setNotifs(u); };
  const clear = () => { sst('adminNotifs', []); setNotifs([]); };
  return (
    <div style={{position:'relative', display:'inline-block'}}>
      <button onClick={()=>{setOpen(v=>!v);if(unread>0)markRead();}}
        style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,cursor:'pointer',padding:'6px 10px',display:'flex',alignItems:'center',gap:6,color:'var(--txt)'}}>
        <span style={{fontSize:18,position:'relative'}}>
          🔔
          {unread>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#dc2626',color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{unread}</span>}
        </span>
      </button>
      {open && (
        <div style={{position:'absolute',right:0,top:'110%',width:'min(340px,92vw)',background:'var(--card)',border:'1.5px solid var(--brd)',borderRadius:12,boxShadow:'0 6px 24px rgba(0,0,0,0.15)',minWidth:320,zIndex:300,padding:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,borderBottom:'1px solid var(--brd)',paddingBottom:8}}>
            <span style={{fontWeight:700,fontSize:13}}>🔔 إشعارات المسؤول</span>
            {notifs.length > 0 && <button onClick={clear} style={{fontSize:11,color:'#dc2626',background:'none',border:'none',cursor:'pointer'}}>مسح الكل</button>}
          </div>
          {notifs.length === 0 && <div style={{color:'var(--txt3)',textAlign:'center',padding:16,fontSize:13}}>لا توجد إشعارات</div>}
          {notifs.slice(0, 12).map(n => (
            <div key={n.id} style={{padding:'9px 0',borderBottom:'1px solid var(--brd)',fontSize:12}}>
              <div style={{fontWeight: n.read ? 400 : 700, fontSize:13}}>{n.msg}</div>
              <div style={{color:'var(--txt3)',fontSize:11,marginTop:2}}>{n.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentsDetailTab({ mS, mT, allStudents }: { mS: Student[]; mT: Teacher[]; allStudents: Student[]; }) {
  const [semF, setSemF] = React.useState('');
  const [teachF, setTeachF] = React.useState('');
const [hifzData, setHifzData] = React.useState<Record<string,any>>({});
React.useEffect(() => {
  const load = () => {
    try { setHifzData(JSON.parse(localStorage.getItem('hifzRecords') || '{}')); }
    catch {}
  };
  load();
  window.addEventListener('storage', load);
  return () => window.removeEventListener('storage', load);
}, []);const [evalData, setEvalData] = React.useState<Record<string,any>>({});
React.useEffect(() => {
  const load = () => {
    try { setEvalData(JSON.parse(localStorage.getItem('semEvals') || '{}')); } 
    catch {}
  };
  load();
  window.addEventListener('storage', load);
  return () => window.removeEventListener('storage', load);
}, []);  const filtered = (!semF || !teachF) ? [] : mS.filter(s => s.teacherId === parseInt(teachF));
  const getGrade = (sid: number): string => { if (!semF) return ''; const ev = evalData[`${sid}_${semF}`]; return ev?.grade || ''; };
  const gradeCounts: Record<string,number> = {};
  if (semF) { filtered.forEach(s => { const g = getGrade(s.id); if (g) gradeCounts[g] = (gradeCounts[g] || 0) + 1; }); }
const gradeGroups = [
  { key:'ممتاز',  color:'#2d8a48', count:gradeCounts['ممتاز']||0, label:'ممتاز' },
  { key:'جيد',    color:'#b8872a', count: gradeCounts['جيد']||0,label:'جيد'  },
  { key:'متوسط',  color:'#ef6c00', count: gradeCounts['متوسط']||0,label:'متوسط'},
  { key:'ضعيف',   color:'#dc2626', count: gradeCounts['ضعيف']||0, label:'ضعيف'},
];
  const maxCount = Math.max(1, ...gradeGroups.map(g => g.count));
  const SEMESTERS = [{id:'1', label:'الفصل الأول'}, {id:'2', label:'الفصل الثاني'},{id:'3', label:'الفصل الثالث'}];
  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <select className="sel" style={{minWidth:140}} value={semF} onChange={e => setSemF(e.target.value)}>
          <option value="">كل الفصول</option>
          {SEMESTERS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className="sel" style={{minWidth:160}} value={teachF} onChange={e => setTeachF(e.target.value)}>
          <option value="">كل المؤطرين</option>
          {mT.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span style={{fontSize:12,color:'var(--txt3)',alignSelf:'center'}}>{filtered.length} طالب</span>
      </div>
      {filtered.length > 0 && semF && (
        <div style={{background:'var(--card)',border:'2px solid var(--brd)',borderRadius:'var(--r)',padding:'20px 24px',marginBottom:16,boxShadow:'var(--sh)'}}>
          <div style={{display:'flex',gap:0,direction:'rtl',alignItems:'stretch'}}>
            {gradeGroups.map((g, idx) => (
              <div key={g.key} style={{flex:1,padding:'0 20px',borderLeft:idx<gradeGroups.length-1?'1px solid var(--brd)':'none',display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontWeight:700,fontSize:14,color:'var(--txt)',textAlign:'right'}}>{g.label}</div>
                <div style={{background:'var(--brd)',borderRadius:4,height:8,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:4,background:g.count>0?g.color:'transparent',width:g.count>0?`${Math.round((g.count/maxCount)*100)}%`:'0%',transition:'width 0.4s ease'}}/>
                </div>
                <div style={{fontSize:12,color:'var(--txt3)',textAlign:'right'}}>{g.count} طالب</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:'var(--g)'}}>قائمة الطلبة</div>
      {filtered.map(s => {
        const grade = getGrade(s.id);
        const gradeCol = grade==='ممتاز'||grade==='جيد جداً'?'#2d8a48':grade==='جيد'||grade==='متوسط'?'#b8872a':'#dc2626';
        return (
          <div key={s.id} style={{background:'var(--card)',border:'2px solid var(--brd)',borderRadius:'var(--r)',padding:14,display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,boxShadow:'var(--sh)',marginBottom:10,direction:'rtl'}}>
            <div style={{flex:1,textAlign:'right'}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{s.name}</div>
              <div style={{color:'var(--txt3)',fontSize:11,marginBottom:3}}>المؤطر: {s.teacherName}</div>
              {semF && evalData[`${s.id}_${semF}`]?.surah && (
              <div style={{fontSize:12,color:'var(--g)'}}>📖 {evalData[`${s.id}_${semF}`].surah}</div>)}
              {semF && evalData[`${s.id}_${semF}`]?.attendance && (
              <div style={{fontSize:11,color:'var(--txt3)'}}>📊 الحضور: {evalData[`${s.id}_${semF}`].attendance}%</div>)}
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0}}>
            <Ring pct={semF && grade ? (grade==='ممتاز'?90:grade==='جيد جداً'?80:grade==='جيد'?70:grade==='متوسط'?50:30) : 0}/>                {semF && grade ? (
                <span style={{background:`${gradeCol}18`,color:gradeCol,border:`1px solid ${gradeCol}40`,borderRadius:12,padding:'2px 10px',fontWeight:700,fontSize:11}}>{grade}</span>
              ) : semF ? <span style={{color:'var(--txt3)',fontSize:10}}>لم يُقيَّم</span> : null}
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && <div style={{textAlign:'center',color:'var(--txt3)',padding:40}}>لا يوجد طلبة</div>}
    </div>
  );
}

function MosquesTab() {
  const ready = useDataReady();
  const [search, setSearch] = useState('');
  const [list, setList]     = useState<Mosque[]>([]);
  const [detail, setDetail] = useState<Mosque | null>(null);
  const [dtab, setDtab]     = useState('overview');
  const [addM, setAddM]     = useState(false);
  const [editM, setEditM]   = useState<Mosque | null>(null);
  const [form, setForm]     = useState({ name:'', imam:'' });
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const { toast, show } = useToast();
  useEffect(() => {
    if (!ready) return;
    setList(initialMosques);
    const load = () => {
      const dynT = gst<Teacher[]>('dynamicTeachers', []);
      const dynS = gst<Student[]>('dynamicStudents', []);
      setAllTeachers([...initialTeachers, ...dynT]);
      setAllStudents([...initialStudents, ...dynS]);
    };
    load(); window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, [ready]);
  if (!ready) return <div style={{textAlign:'center',padding:60,color:'var(--txt3)'}}>⏳ جاري تحميل البيانات...</div>;
  const filtered = list.filter(m => m.name.includes(search) || m.imam?.includes(search));
  if (detail) {
    const mT = allTeachers.filter(t => t.mosqueId === detail.id);
    const mS = allStudents.filter(s => s.mosqueId === detail.id);
    return (
      <div className="main pgin">
        <button className="back" onClick={() => { setDetail(null); setDtab('overview'); }}>← العودة للقائمة</button>
        <div style={{background:'var(--card)',border:'2px solid var(--brd)',borderRadius:'var(--r)',padding:18,textAlign:'center',marginBottom:16,boxShadow:'var(--sh)'}}>
          <div style={{fontSize:20,fontWeight:700}}>{detail.name}</div>
          <div style={{color:'var(--txt3)',fontSize:13,marginTop:3}}>{detail.municipality}</div>
        </div>
        <div className="pills">
          {(['overview','teachers','students'] as const).map((k) => {
            const labels = {overview:'نظرة عامة', teachers:'المؤطرون', students:'الطلبة'};
            return <button key={k} className={`pill ${dtab===k?'on':''}`} onClick={() => setDtab(k)}>{labels[k]}</button>;
          })}
        </div>
        {dtab === 'overview' && (
          <div className="icard">
            {([['اسم الإمام',detail.imam||'—'],['البلدية',detail.municipality||'الأغواط'],['عدد المؤطرين',mT.length],['عدد الطلبة',mS.length]] as [string,string|number][]).map(([l,v]) => (
              <div key={l} className="irow"><span className="ilbl">{l}</span><span className="ival">{v}</span></div>
            ))}
            <div className="mapph"><img src="/map.png" alt="خريطة" className="ico"/><p>عرض موقع المسجد على الخريطة</p></div>
          </div>
        )}
        {dtab === 'teachers' && (
          <div className="g2">
            {mT.length === 0 && <div style={{gridColumn:'1/-1',textAlign:'center',color:'var(--txt3)',padding:40}}>لا يوجد مؤطرون</div>}
            {mT.map(t => (
              <div key={t.id} style={{background:'var(--card)',border:'2px solid var(--brd)',borderRadius:'var(--r)',padding:16,boxShadow:'var(--sh)'}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{t.name}</div>
                <div style={{color:'var(--txt3)',fontSize:12,marginBottom:10}}>{t.rank}</div>
                <div className="mcard-row"><span className="mcard-row-v">{allStudents.filter(s => s.teacherId === t.id).length}</span><span className="mcard-row-l">عدد الطلبة</span></div>
              </div>
            ))}
          </div>
        )}
        {dtab === 'students' && <StudentsDetailTab mS={mS} mT={mT} allStudents={allStudents} />}
      </div>
    );
  }
  return (
    <div className="main pgin">
      <div className="bism">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
      <div className="stats">
        {[{l:'اجمالي المساجد',v:list.length,img:'/mosque.png'},{l:'المؤطرون',v:allTeachers.length,img:'/teacher.png'},{l:'الطلبة',v:allStudents.length,img:'/student.png'}].map(s => (
          <div key={s.l} className="stat">
            <img src={s.img} alt={s.l} className="ico" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
            <div className="stat-info"><div className="stat-lbl">{s.l}</div><div className="stat-val">{s.v}</div></div>
          </div>
        ))}
      </div>
      <div className="fgap" style={{marginBottom:14}}>
        <button className="btn btn-solid" onClick={() => setAddM(true)}>+ إضافة مسجد جديد</button>
      </div>
      <div className="sw">
        <input className="sinp" placeholder="البحث عن مسجد" value={search} onChange={e => setSearch(e.target.value)}/>
        <img className="sico" src="/Searchh.png" alt="بحث"/>
      </div>
      <div className="mcards">
        {filtered.map(m => (
          <div key={m.id} className="mcard">
            <div className="mcard-top">
              <img src="/mosque.png" alt="مسجد" className="ico"/>
              <div className="mcard-text"><div className="mcard-nm">{m.name}</div><div className="mcard-sb">{m.municipality}</div></div>
            </div>
            <div className="mcard-row"><span className="mcard-row-v">{allTeachers.filter(t => t.mosqueId === m.id).length}</span><span className="mcard-row-l">عدد المؤطرين</span></div>
            <div className="mcard-row"><span className="mcard-row-v">{allStudents.filter(s => s.mosqueId === m.id).length}</span><span className="mcard-row-l">عدد الطلبة</span></div>
            <div style={{display:'flex',gap:7,marginTop:4}}>
              <button className="btn" style={{flex:1}} onClick={() => setDetail(m)}>عرض التفاصيل</button>
              <button className="btn btn-gold" onClick={() => setEditM({...m})}>تعديل</button>
            </div>
          </div>
        ))}
      </div>
      {addM && (
        <Modal title="إضافة مسجد جديد" onClose={() => setAddM(false)}>
          <F label="اسم المسجد *"><input className="sinp" style={{paddingLeft:16}} value={form.name} onChange={e => setForm(p => ({...p,name:e.target.value}))} placeholder="اسم المسجد"/></F>
          <F label="اسم الإمام"><input className="sinp" style={{paddingLeft:16}} value={form.imam} onChange={e => setForm(p => ({...p,imam:e.target.value}))} placeholder="اسم الإمام"/></F>
          <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:10}}>
            <button className="btn btn-gold" onClick={() => setAddM(false)}>إلغاء</button>
            <button className="btn btn-solid" onClick={() => { if (!form.name) return; setList(p => [...p, {...form, id:Date.now(), municipality:'الأغواط', teachersCount:0, studentsCount:0, progress:0}]); setAddM(false); setForm({name:'',imam:''}); show('✅ تمت إضافة المسجد'); }}>حفظ</button>
          </div>
        </Modal>
      )}
      {editM && (
        <Modal title="تعديل المسجد" onClose={() => setEditM(null)}>
          <F label="اسم المسجد"><input className="sinp" style={{paddingLeft:16}} value={editM.name} onChange={e => setEditM(p => p ? {...p, name:e.target.value} : p)}/></F>
          <F label="اسم الإمام"><input className="sinp" style={{paddingLeft:16}} value={editM.imam||''} onChange={e => setEditM(p => p ? {...p, imam:e.target.value} : p)}/></F>
          <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:10}}>
            <button className="btn btn-gold" onClick={() => setEditM(null)}>إلغاء</button>
            <button className="btn btn-solid" onClick={() => { if (!editM) return; setList(p => p.map(m => m.id === editM.id ? editM : m)); setEditM(null); show('✅ تم التعديل'); }}>حفظ التعديلات</button>
          </div>
        </Modal>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function TeachersTab() {
  const ready = useDataReady();
  const [search, setSearch] = useState('');
  const [mF, setMF]         = useState('');
  const [rF, setRF]         = useState('');
  const [list, setList]     = useState<Teacher[]>([]);
  const [addM, setAddM]     = useState(false);
  const [editT, setEditT]   = useState<Teacher | null>(null);
  const [newAccount, setNewAccount] = useState<{username:string;password:string;name:string}|null>(null);
  const [form, setForm]     = useState({name:'',rank:'',role:'موظف',dob:'',education:'',phone:'',mosqueId:'',generation:'',username:'',password:''});
  const { toast, show } = useToast();
  useEffect(() => {
    if (!ready) return;
    const load = () => { const dyn = gst<Teacher[]>('dynamicTeachers', []); setList([...initialTeachers, ...dyn]); };
    load(); window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, [ready]);
  const mList = [...new Set(list.map(t => t.mosqueName).filter(Boolean))].sort();
  const rList = [...new Set(list.map(t => t.rank).filter(Boolean))].sort();
  const filtered = list.filter(t => (!search || t.name.includes(search) || t.rank.includes(search)) && (!mF || t.mosqueName === mF) && (!rF || t.rank === rF));
  const EDUCATION_LEVELS = ['ابتدائي','متوسط','ثانوي','جامعي','ليسانس','ماستر','دكتوراه'];
  const AR: Record<string,string> = {'ا':'a','أ':'a','إ':'a','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ى':'a','ة':'a','ء':'','ئ':'y','ؤ':'w'};
  const toEn = (s: string) => s.split('').map(c => AR[c]??'').join('').replace(/[^a-z0-9]/g,'');
  const genUsername = (fullName: string): string => { const parts = fullName.trim().split(/\s+/); if (!parts.length) return 'user'; const firstChar = toEn(parts[0][0]) || 'x'; const family = toEn(parts[parts.length - 1]) || 'tc'; return `${firstChar}.${family}`; };
  const saveNewTeacher = async () => {
  if (!form.name) { show('⚠️ الاسم مطلوب'); return; }
  const dynT = gst<Teacher[]>('dynamicTeachers', []);
  const allIds = [...initialTeachers.map(t => t.id), ...dynT.map(t => t.id)];
  const newId = Math.max(...allIds, 170) + 1;
  let username = genUsername(form.name);
  const dynU = gst<AppUser[]>('dynamicUsers', []);
  let suffix = 0, candidate = username;
  while (dynU.some(u => u.username === candidate)) { suffix++; candidate = username + suffix; }
  username = candidate;
  const password = 'pass123';
  const mq = initialMosques.find(m => m.id === parseInt(form.mosqueId));
  const newT: Teacher = { id:newId, name:form.name, rank:form.rank, role:form.role, dob:form.dob, education:form.education, generation:form.generation, phone:form.phone, municipality:'الأغواط', mosqueId:parseInt(form.mosqueId)||1, mosqueName:mq?.name||'' };
  
  // حفظ في Supabase
  await supabase.from('app_users').insert({
    id: newId + 1000,
    username,
    password,
    role: 'teacher',
    name: form.name,
    teacher_id: newId,
    student_ids: null,
  });

  // حفظ في localStorage
  sst('dynamicTeachers', [...dynT, newT]);
  dynU.push({ id:newId+1000, username, password, role:'teacher', name:form.name, teacherId:newId });
  sst('dynamicUsers', dynU);
  
  setNewAccount({ username, password, name:form.name });
  setAddM(false);
  setForm({name:'',rank:'',role:'موظف',dob:'',education:'',phone:'',mosqueId:'',generation:'',username:'',password:''});
  const an = gst<Notif[]>('adminNotifs', []);
  an.unshift({ id:Date.now(), msg:`👤 تم إضافة مؤطر: ${form.name} — المستخدم: ${username}`, time:new Date().toLocaleString('ar'), read:false });
  sst('adminNotifs', an);
};
  return (
    <div className="main pgin">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:16}}>
        <div className="stitle">
          <img src="/teacher.png" alt="" className="ico" style={{width:40,height:40}} onError={e => {(e.target as HTMLImageElement).style.display='none';}}/>
          المؤطرون <span style={{fontSize:13,color:'var(--txt3)',fontWeight:400}}>({filtered.length}/{list.length})</span>
        </div>
        <button className="btn btn-solid" onClick={() => setAddM(true)}>+ إضافة مؤطر</button>
      </div>
      <div className="fgap" style={{marginBottom:12}}>
        <div className="sw" style={{flex:2,minWidth:200,margin:0}}>
          <input className="sinp" placeholder="البحث عن مؤطر" value={search} onChange={e => setSearch(e.target.value)}/>
          <img className="sico" src="/Searchh.png" alt="بحث"/>
        </div>
<select className="sel" value={mF} onChange={e => setMF(e.target.value)}>
  <option value="">المسجد</option>
  {initialMosques.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
</select>
       <select className="sel" value={rF} onChange={e => setRF(e.target.value)}><option value="">الرتبة</option>{rList.slice(0,20).map(r => <option key={r}>{r}</option>)}</select>
      </div>
      <div className="tw">
        <table className="tbl">
          <thead><tr><th>#</th><th>الاسم واللقب</th><th>الرتبة</th><th className="hm">الصفة</th><th className="hm">الهاتف</th><th className="hm">المستوى</th><th>المسجد</th><th>الاجراءات</th></tr></thead>
          <tbody>
            {filtered.slice(0,200).map((t,i) => (
              <tr key={t.id}>
                <td style={{color:'var(--txt3)'}}>{i+1}</td>
                <td style={{fontWeight:600}}>{t.name}</td>
                <td style={{fontSize:11}}>{t.rank}</td>
                <td className="hm"><span className={`bdg ${t.role==='موظف'?'bdg-g':'bdg-gld'}`}>{t.role}</span></td>
                <td className="hm" style={{direction:'ltr',fontSize:12}}>{t.phone||'—'}</td>
                <td className="hm" style={{fontSize:12}}>{t.education||'—'}</td>
                <td style={{fontSize:12}}>{t.mosqueName}</td>
                <td style={{display:'flex',gap:5,padding:'8px 14px'}}>
                  <button className="btn btn-sm" onClick={() => setEditT({...t})}>تعديل</button>
                  <button className="btn btn-sm" style={{borderColor:'#dc2626',color:'#dc2626'}} onClick={() => { if(!confirm(`حذف ${t.name}؟`))return; const dynT=gst<Teacher[]>('dynamicTeachers',[]); sst('dynamicTeachers',dynT.filter(x=>x.id!==t.id)); setList(p=>p.filter(x=>x.id!==t.id)); }}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{textAlign:'center',padding:40,color:'var(--txt3)'}}>لا توجد نتائج</div>}
      </div>

      {/* ── Modal إضافة مؤطر ── */}
      {addM && (
        <Modal title="إضافة مؤطر جديد" onClose={() => setAddM(false)} wide>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <F label="الاسم واللقب *"><input className="sinp" style={{paddingLeft:16}} value={form.name} onChange={e => setForm(p => ({...p,name:e.target.value}))} placeholder="الاسم الكامل"/></F>
            <F label="الرتبة"><input className="sinp" style={{paddingLeft:16}} value={form.rank} onChange={e => setForm(p => ({...p,rank:e.target.value}))} placeholder="مثال: إمام أستاذ"/></F>
            <F label="الصفة"><select className="sel" style={{width:'100%'}} value={form.role} onChange={e => setForm(p => ({...p,role:e.target.value}))}><option>موظف</option><option>متطوع</option></select></F>
            <F label="تاريخ الميلاد"><input className="sinp" style={{paddingLeft:16}} type="date" value={form.dob} onChange={e => setForm(p => ({...p,dob:e.target.value}))}/></F>
            <F label="المستوى الدراسي"><select className="sel" style={{width:'100%'}} value={form.education} onChange={e => setForm(p => ({...p,education:e.target.value}))}><option value="">اختر</option>{EDUCATION_LEVELS.map(v => <option key={v}>{v}</option>)}</select></F>
            <F label="رقم الهاتف"><input className="sinp" style={{paddingLeft:16}} value={form.phone} onChange={e => setForm(p => ({...p,phone:e.target.value}))} placeholder="06 XX XX XX XX"/></F>
            <F label="البنوة">
              <input className="sinp" style={{paddingLeft:16}} value={form.generation}
                onChange={e => setForm(p => ({...p,generation:e.target.value}))}
                placeholder="مثال: 1 أو 2"/>
            </F>
            <F label="المسجد">
              <select className="sel" style={{width:'100%'}} value={form.mosqueId} onChange={e => setForm(p => ({...p,mosqueId:e.target.value}))}>
                <option value="">اختر المسجد</option>
                {initialMosques.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </F>
          </div>
          <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:12}}>
            <button className="btn btn-gold" onClick={() => setAddM(false)}>إلغاء</button>
            <button className="btn btn-solid" onClick={saveNewTeacher}>✅ حفظ وإنشاء الحساب</button>
          </div>
        </Modal>
      )}

      {/* ── Modal حساب جديد ── */}
      {newAccount && (
        <Modal title="✅ تم إنشاء حساب المؤطر" onClose={() => setNewAccount(null)}>
          <div style={{textAlign:'center',padding:16}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{newAccount.name}</div>
            <div style={{background:'#f0fdf4',border:'2px solid #86efac',borderRadius:10,padding:'16px 20px',margin:'16px 0',textAlign:'right'}}>
              <div style={{marginBottom:10,fontSize:13}}><span style={{color:'var(--txt3)'}}>اسم المستخدم: </span><strong style={{fontFamily:'monospace',fontSize:16,color:'#2d8a48'}}>{newAccount.username}</strong></div>
              <div style={{fontSize:13}}><span style={{color:'var(--txt3)'}}>كلمة المرور: </span><strong style={{fontFamily:'monospace',fontSize:16,color:'#2d8a48'}}>{newAccount.password}</strong></div>
            </div>
            <button className="btn btn-solid" style={{width:'100%'}} onClick={() => { setNewAccount(null); show('✅ تمت إضافة المؤطر بنجاح'); }}>حسناً، تم الحفظ</button>
          </div>
        </Modal>
      )}

      {/* ── Modal تعديل مؤطر ── */}
      {editT && (
        <Modal title={`تعديل: ${editT.name}`} onClose={() => setEditT(null)} wide>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <F label="الاسم واللقب"><input className="sinp" style={{paddingLeft:16}} value={editT.name} onChange={e => setEditT(p => p?{...p,name:e.target.value}:p)}/></F>
            <F label="الرتبة"><input className="sinp" style={{paddingLeft:16}} value={editT.rank} onChange={e => setEditT(p => p?{...p,rank:e.target.value}:p)}/></F>
            <F label="الصفة"><select className="sel" style={{width:'100%'}} value={editT.role} onChange={e => setEditT(p => p?{...p,role:e.target.value}:p)}><option>موظف</option><option>متطوع</option></select></F>
            <F label="تاريخ الميلاد"><input className="sinp" style={{paddingLeft:16}} type="date" value={editT.dob||''} onChange={e => setEditT(p => p?{...p,dob:e.target.value}:p)}/></F>
            <F label="المستوى الدراسي"><select className="sel" style={{width:'100%'}} value={editT.education||''} onChange={e => setEditT(p => p?{...p,education:e.target.value}:p)}><option value="">اختر</option>{['ابتدائي','متوسط','ثانوي','جامعي','ليسانس','ماستر','دكتوراه'].map(v => <option key={v}>{v}</option>)}</select></F>
            <F label="رقم الهاتف"><input className="sinp" style={{paddingLeft:16}} value={editT.phone||''} onChange={e => setEditT(p => p?{...p,phone:e.target.value}:p)}/></F>
            <F label="البنوة">
              <input className="sinp" style={{paddingLeft:16}} value={editT.generation||''}
                onChange={e => setEditT(p => p?{...p,generation:e.target.value}:p)}
                placeholder="مثال: 1 أو 2"/>
            </F>
            <F label="المسجد">
              <select className="sel" style={{width:'100%'}} value={String(editT.mosqueId)}
                onChange={e => { const mq=initialMosques.find(m=>m.id===parseInt(e.target.value)); setEditT(p=>p?{...p,mosqueId:parseInt(e.target.value),mosqueName:mq?.name||''}:p); }}>
                <option value="">اختر المسجد</option>
                {initialMosques.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </F>
          </div>
          <div style={{display:'flex',gap:9,justifyContent:'flex-end',marginTop:12}}>
            <button className="btn btn-gold" onClick={() => setEditT(null)}>إلغاء</button>
            <button className="btn btn-solid" onClick={() => { if(!editT)return; const dynT=gst<Teacher[]>('dynamicTeachers',[]); const isInDyn=dynT.some(t=>t.id===editT.id); if(isInDyn)sst('dynamicTeachers',dynT.map(t=>t.id===editT.id?editT:t)); setList(p=>p.map(t=>t.id===editT.id?{...editT}:t)); setEditT(null); show('✅ تم تعديل بيانات المؤطر'); }}>حفظ التعديلات</button>
          </div>
        </Modal>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function StudentsTab() {
  const ready = useDataReady();
  const [search, setSearch] = useState('');
  const [mF, setMF] = useState('');
  const [tF, setTF] = useState('');
  const [gF, setGF] = useState('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  useEffect(() => {
    if (!ready) return;
    const load = () => { const dynS=gst<Student[]>('dynamicStudents',[]); const dynT=gst<Teacher[]>('dynamicTeachers',[]); setAllStudents([...initialStudents,...dynS]); setAllTeachers([...initialTeachers,...dynT]); };
    load(); window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, [ready]);
  if (!ready) return <div style={{textAlign:'center',padding:60,color:'var(--txt3)'}}>⏳ جاري تحميل البيانات...</div>;
  const filtered = allStudents.filter(s => (!search||s.name.includes(search)||s.fatherName.includes(search))&&(!mF||s.mosqueName===mF)&&(!tF||s.teacherName===tF)&&(!gF||s.gender===gF));
  return (
    <div className="main pgin">
      <div className="stitle">
        <img src="/student.png" alt="" className="ico" style={{width:40,height:40}} onError={e => {(e.target as HTMLImageElement).style.display='none';}}/>
        الطلبة <span style={{fontSize:13,color:'var(--txt3)',fontWeight:400}}>({filtered.length}/{allStudents.length})</span>
      </div>
      <div className="sw"><input className="sinp" placeholder="البحث عن طالب" value={search} onChange={e => setSearch(e.target.value)}/><img className="sico" src="/Searchh.png" alt="بحث"/></div>
      <div className="fgap" style={{marginBottom:16}}>
        <select className="sel" value={mF} onChange={e => setMF(e.target.value)}>
  <option value="">المسجد</option>
  {initialMosques.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
</select>
<select className="sel" value={tF} onChange={e => setTF(e.target.value)}>
  <option value="">المؤطر</option>
  {allTeachers.filter(t => !mF || t.mosqueName === mF).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
</select>
      </div>
      <div className="tw">
        <table className="tbl">
          <thead><tr><th>#</th><th>الاسم واللقب</th><th>تاريخ الميلاد</th><th>الجنس</th><th>اسم الأب</th><th>المؤطر</th><th>المسجد</th></tr></thead>
          <tbody>
            {filtered.map((s,i) => (
              <tr key={s.id}>
                <td style={{color:'var(--txt3)'}}>{i+1}</td>
                <td style={{fontWeight:600}}>{s.name}</td>
                <td>{s.dob}</td>
                <td><span className={`bdg ${s.gender==='ذكر'?'bdg-g':'bdg-gld'}`}>{s.gender}</span></td>
                <td>{s.fatherName}</td>
                <td>{s.teacherName}</td>
                <td>{s.mosqueName}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{textAlign:'center',padding:40,color:'var(--txt3)'}}>لا توجد نتائج</div>}
      </div>
    </div>
  );
}

function SchedulesTab() {
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sem, setSem] = useState<1|2|3>(1);
  const { toast } = useToast();
  const SEMESTERS = [
    { id:1 as const, label:'الفصل الأول', range:'جانفي – أفريل' },
    { id:2 as const, label:'الفصل الثاني', range:'ماي – أوت' },
    { id:3 as const, label:'الفصل الثالث', range:'سبتمبر – ديسمبر' },
  ];
  useEffect(() => {
    const load = () => {
const sent: Record<string, {rows:{day:string;startTime:string;endTime:string;note:string}[];sent:boolean;sem?:number;}> = {};
[1,2,3].forEach(sem => {
  initialTeachers.concat(gst<Teacher[]>('dynamicTeachers',[])).forEach(t => {
    const key = `sentSchedules_t${t.id}_s${sem}`;
    const data = gst<{rows:{day:string;startTime:string;endTime:string;note:string}[];sent:boolean;sem?:number;}|null>(key, null);
    if (data) sent[t.id] = data;
  });
});      const fromSent: any[] = Object.entries(sent).filter(([,v])=>v.sent).flatMap(([tid,data]) => {
        const allT=[...initialTeachers,...gst<Teacher[]>('dynamicTeachers',[])];
        const tch=allT.find(t=>t.id===parseInt(tid));
        const scheduleSem=(data as any).sem??1;
        return data.rows.map((r,i)=>({id:parseInt(tid)*1000+i,teacherId:parseInt(tid),teacherName:tch?.name||'',mosqueId:tch?.mosqueId||0,mosqueName:tch?.mosqueName||'',sem:scheduleSem,...r}));
      });
      const sentTids=fromSent.map(s=>s.teacherId);
      setScheduleData(fromSent);
    };
    load(); window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);
  const trimmed = search.trim();
  const matchedMosque = trimmed ? initialMosques.find(m=>m.name.includes(trimmed)) : null;
  const filtered = matchedMosque ? scheduleData.filter(s=>(s.mosqueId===matchedMosque.id||s.mosqueName===matchedMosque.name)&&(s as any).sem===sem) : [];
  const maxRows = Math.max(4, ...DAYS.map(d=>filtered.filter(s=>s.day===d).length));
  return (
    <div className="main pgin">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:16}}>
        <div className="stitle">📅 الجداول الزمنية</div>
        <button className="btn btn-gold" onClick={() => window.print()}>🖨️ طباعة الجدول</button>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        {SEMESTERS.map(s=>(
          <button key={s.id} onClick={()=>setSem(s.id)} style={{padding:'7px 16px',borderRadius:20,border:'1.5px solid',fontSize:12,cursor:'pointer',fontFamily:'Cairo,sans-serif',transition:'all 0.2s',background:sem===s.id?'var(--g)':'var(--card)',color:sem===s.id?'#fff':'var(--txt2)',borderColor:sem===s.id?'var(--g)':'var(--brd)'}}>
            <div style={{fontWeight:700}}>{s.label}</div>
            <div style={{fontSize:10,opacity:0.8}}>{s.range}</div>
          </button>
        ))}
      </div>
      <div className="sw" style={{marginBottom:16}}>
        <input className="sinp" placeholder="ابحث باسم المسجد..." value={search} onChange={e=>setSearch(e.target.value)} autoComplete="off"/>
        <img className="sico" src="/Searchh.png" alt="بحث" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
      </div>
      {matchedMosque && (
        <div style={{background:'var(--gp)',border:'1.5px solid var(--gs)',borderRadius:'var(--r)',padding:'11px 18px',display:'flex',alignItems:'center',gap:10,marginBottom:14,flexWrap:'wrap'}}>
          <span style={{fontSize:18}}></span>
          <span style={{fontWeight:700,fontSize:15,color:'var(--g)'}}>{matchedMosque.name}</span>
          <span style={{fontSize:12,color:'var(--txt3)',marginRight:'auto'}}>{filtered.length} حصة مسجلة</span>
        </div>
      )}
      {trimmed && !matchedMosque && (
        <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:'var(--r)',padding:'10px 16px',marginBottom:14,fontSize:13,color:'#dc2626',textAlign:'center'}}>لا يوجد مسجد بهذا الاسم</div>
      )}
      <div style={{overflowX:'auto',borderRadius:'var(--r)',border:'2px solid var(--brd)',boxShadow:'var(--sh)',background:'var(--card)'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:560,direction:'rtl'}}>
          <thead>
            <tr>{DAYS.map(day=><th key={day} style={{background:'var(--g)',color:'#fff',fontFamily:'Cairo,sans-serif',fontWeight:700,fontSize:13,padding:'13px 8px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,0.15)'}}>{day}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({length:maxRows}).map((_,rowIdx)=>(
              <tr key={rowIdx}>
                {DAYS.map(day=>{
                  const cell=filtered.filter(s=>s.day===day)[rowIdx];
                  return (
                    <td key={day} style={{border:'1px solid var(--brd)',padding:'8px 6px',verticalAlign:'middle',textAlign:'center',minWidth:95,height:72,background:rowIdx%2===0?'var(--card)':'rgba(234,245,238,0.3)'}}>
                      {cell&&(
                        <div style={{background:'var(--gp)',border:'1px solid var(--gs)',borderRadius:8,padding:'7px 6px',lineHeight:1.6}}>
                          <div style={{fontWeight:700,color:'var(--txt)',fontSize:12,marginBottom:2}}>{cell.teacherName}</div>
                          <div style={{color:'var(--gold)',fontWeight:700,fontSize:11,direction:'ltr'}}>{cell.startTime}-{cell.endTime}</div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!trimmed && <div style={{textAlign:'center',color:'var(--txt3)',marginTop:14,fontSize:12}}>ابحث عن مسجد لعرض جدوله الأسبوعي</div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ReportsTab() {
  const [yearF,   setYearF]   = useState('');
  const [mosqueS, setMosqueS] = useState('');
  const [search,  setSearch]  = useState('');
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const load = () => setRecords(gst<any[]>('khatmRecords', []));
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  const filteredByYear = yearF.trim() ? records.filter(r => r.year === yearF.trim()) : records;

  const mosqueCount: Record<string, number> = {};
  filteredByYear.forEach(r => { mosqueCount[r.mosqueName] = (mosqueCount[r.mosqueName] || 0) + 1; });
  const bME = Object.entries(mosqueCount).sort((a,b) => b[1]-a[1])[0];
  const bestMosque = bME ? { name: bME[0], count: bME[1] } : null;

  const teacherCount: Record<string, number> = {};
  filteredByYear.forEach(r => { teacherCount[r.teacherName] = (teacherCount[r.teacherName] || 0) + 1; });
  const bTE = Object.entries(teacherCount).sort((a,b) => b[1]-a[1])[0];
  const bestTeacher = bTE ? { name: bTE[0], count: bTE[1] } : null;

  const filtered = filteredByYear.filter(r =>
    (!mosqueS.trim() || r.mosqueName.includes(mosqueS.trim())) &&
    (!search.trim()  || r.studentName.includes(search) || r.teacherName.includes(search))
  );

  const byYear: Record<string, any[]> = {};
  filtered.forEach(r => { if (!byYear[r.year]) byYear[r.year] = []; byYear[r.year].push(r); });

  return (
    <div className="main pgin">
      <div className="stitle">🏆 تقارير خاتمي القرآن</div>
      <div className="stats" style={{marginBottom: 30}}>
        <div className="stat" style={{padding:'10px 14px'}}>
          <img src="/student.png" alt="" className="ico" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
          <div className="stat-info">
            <div className="stat-lbl">{yearF.trim() ? `إجمالي خاتمي ${yearF.trim()}` : 'إجمالي الخاتمين'}</div>
            <div className="stat-val">{filteredByYear.length}</div>
          </div>
        </div>
        <div className="stat" style={{padding:'10px 14px'}}>
          <img src="/mosque.png" alt="" className="ico" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
          <div className="stat-info">
            <div className="stat-lbl">أفضل مسجد</div>
            <div className="stat-val" style={{fontSize: bestMosque?.name && bestMosque.name.length > 10 ? 15 : 24}}>{bestMosque?.name || 'لا يوجد'}</div>
          </div>
        </div>
        <div className="stat" style={{padding:'10px 14px'}}>
          <img src="/teacher.png" alt="" className="ico" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
          <div className="stat-info">
            <div className="stat-lbl">أفضل مؤطر</div>
            <div className="stat-val" style={{fontSize: bestTeacher?.name && bestTeacher.name.length > 10 ? 15 : 24}}>{bestTeacher?.name || 'لا يوجد'}</div>
          </div>
        </div>
      </div>
      <div className="fgap" style={{marginBottom:14}}>
        <input className="sinp" style={{width:130}} placeholder="اكتب السنة" value={yearF} onChange={e => setYearF(e.target.value)}/>
        <div className="sw" style={{flex:1,minWidth:160,margin:0}}>
          <input className="sinp" placeholder="بحث باسم المسجد" value={mosqueS} onChange={e => setMosqueS(e.target.value)}/>
          <img className="sico" src="/Searchh.png" alt="بحث" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
        </div>
        <div className="sw" style={{flex:2,minWidth:180,margin:0}}>
          <input className="sinp" placeholder="بحث باسم الطالب أو المؤطر" value={search} onChange={e => setSearch(e.target.value)}/>
          <img className="sico" src="/Searchh.png" alt="بحث" onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
        </div>
      </div>
      {Object.keys(byYear).sort((a,b) => b.localeCompare(a)).map(year => (
        <div key={year}>
          <div style={{display:'flex',alignItems:'center',gap:10,margin:'16px 0 8px'}}>
            <span style={{fontWeight:700,fontSize:15}}>سنة {year}</span>
          </div>
          {byYear[year].map(r => (
            <div key={r.id} style={{background:'var(--card)',border:'2px solid var(--brd)',borderRadius:'var(--r)',padding:14,display:'flex',alignItems:'center',gap:14,boxShadow:'var(--sh)',marginBottom:8,direction:'rtl'}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:'#fef9c3',border:'1.5px solid #fbbf24',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>🏆</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{r.studentName}</div>
                <div style={{fontSize:12,color:'var(--txt3)',marginBottom:3}}>المؤطر: {r.teacherName} — {r.mosqueName}</div>
                {r.notes && <div style={{fontSize:12,color:'var(--g)'}}>{r.notes}</div>}
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
                <span className="bdg bdg-g">{r.khatmType}</span>
                <span style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'2px 10px',fontSize:11,color:'#166534',fontWeight:700}}>{r.date}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
      {filtered.length === 0 && (
        <div style={{textAlign:'center',color:'var(--txt3)',padding:40}}>
          {records.length === 0 ? 'لا يوجد خاتمون بعد' : 'لا توجد نتائج'}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab]   = useState('ms');
  const [user, setUser] = useState<AppUser|null>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.replace('/'); return; }
    const p: AppUser = JSON.parse(u);
    if (p.role !== 'admin') { router.replace('/'); return; }
    setUser(p);
    const t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  }, []);

  if (!user) return null;

  const tabMap: Record<string, React.ReactNode> = {
    ms: <MosquesTab/>,
    tc: <TeachersTab/>,
    st: <StudentsTab/>,
    sc: <SchedulesTab/>,
    rp: <ReportsTab/>,
  };

  return (
    <Layout tab={tab} setTab={setTab} user={user} notifSlot={<AdminNotifBell/>}>
      {tabMap[tab]}
    </Layout>
  );
}