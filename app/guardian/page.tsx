'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../components/Layout';
import type { Student, Teacher, Mosque, AppUser, HifzRecord, SemEval, ScheduleRow, Notif } from '../../types';
import { supabase } from '../../lib/supabase';

let dbStudents: Student[] = [];
let teachers:   Teacher[] = [];
let mosques:    Mosque[]  = [];

function gst<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }
function sst<T>(k: string, v: T) { localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new StorageEvent('storage', { key: k })); }

function useSupabaseData() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([
      supabase.from('students').select('*').order('id'),
      supabase.from('teachers').select('*').order('id'),
      supabase.from('mosques').select('*').order('id'),
    ]).then(([{ data: sData }, { data: tData }, { data: mData }]) => {
      if (sData) dbStudents = sData.map((s: any) => ({ id:s.id, name:s.name, fatherName:s.father_name||'', dob:s.dob||'', gender:s.gender||'ذكر', teacherId:s.teacher_id||0, teacherName:s.teacher_name||'', mosqueId:s.mosque_id||0, mosqueName:s.mosque_name||'', surah:s.surah||'', part:s.part||'', grade:s.grade||'', progress:s.progress||0 }));
      if (tData) teachers  = tData.map((t: any) => ({ id:t.id, name:t.name, rank:t.rank||'', role:t.role||'موظف', dob:t.dob||'', education:t.education||'', generation:t.generation||'', phone:t.phone||'', municipality:t.municipality||'الأغواط', mosqueId:t.mosque_id||0, mosqueName:t.mosque_name||'' }));
      if (mData) mosques   = mData.map((m: any) => ({ id:m.id, name:m.name, municipality:m.municipality||'الأغواط', imam:m.imam||'', teachersCount:m.teachers_count||0, studentsCount:m.students_count||0, progress:m.progress||0 }));
      setReady(true);
    });
  }, []);
  return ready;
}

const SEMESTERS=[
  {id:1,label:'الفصل الأول',range:'جانفي – أفريل',color:'#2d8a48'},
  {id:2,label:'الفصل الثاني',range:'ماي – أوت',color:'#b8872a'},
  {id:3,label:'الفصل الثالث',range:'سبتمبر – ديسمبر',color:'#1d6fa0'},
] as const;
const DAYS=['الاحد','الاثنين','الثلاثاء','الاربعاء','الخميس','الجمعة','السبت'];

const SEM_MONTHS: Record<number, string[]> = {
  1: ['جانفي','فيفري','مارس','أفريل'],
  2: ['ماي','جوان','جويلية','أوت'],
  3: ['سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
};

function gradeToH(g: string|null): number {
  const m: Record<string,number> = {'ممتاز':90,'جيد جداً':80,'جيد':70,'متوسط':50,'ضعيف':30};
  return g ? (m[g] ?? 0) : 0;
}

function GradeBadge({g}:{g:string}) {
  const m: Record<string,string>={'ممتاز':'#2d8a48','جيد جداً':'#2d8a48','جيد':'#b8872a','متوسط':'#b8872a','ضعيف':'#dc2626'};
  const col=m[g]||'#666';
  return <span style={{background:`${col}18`,color:col,border:`1px solid ${col}40`,borderRadius:12,padding:'2px 10px',fontSize:12,fontWeight:700}}>{g}</span>;
}

function NotifBell({studentIds}:{studentIds:number[]}) {
  const [notifs,setNotifs]=useState<Notif[]>([]);
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    const load=()=>{
      const all=gst<Notif[]>('guardianNotifs',[]);
      setNotifs(all.filter(n=>!n.studentId||studentIds.includes(n.studentId)));
    };
    load();window.addEventListener('storage',load);
    return ()=>window.removeEventListener('storage',load);
  },[studentIds.join(',')]);
  const unread=notifs.filter(n=>!n.read).length;
  const markRead=()=>{
    const all=gst<Notif[]>('guardianNotifs',[]);
    const u=all.map(n=>(!n.studentId||studentIds.includes(n.studentId))?{...n,read:true}:n);
    sst('guardianNotifs',u);
    setNotifs(u.filter(n=>!n.studentId||studentIds.includes(n.studentId)));
  };
  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <button onClick={()=>{setOpen(v=>!v);if(unread>0)markRead();}}
        style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,cursor:'pointer',padding:'6px 10px',display:'flex',alignItems:'center',gap:6,color:'var(--txt)'}}>
        <span style={{fontSize:18,position:'relative'}}>
          🔔
          {unread>0&&<span style={{position:'absolute',top:-4,right:-4,background:'#dc2626',color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{unread}</span>}
        </span>
      </button>
      {open&&(
        <div style={{position:'absolute',right:0,top:'110%',width:'min(340px,92vw)',background:'var(--card)',border:'1.5px solid var(--brd)',borderRadius:12,boxShadow:'0 6px 24px rgba(0,0,0,0.15)',minWidth:300,zIndex:200,padding:14}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:10,borderBottom:'1px solid var(--brd)',paddingBottom:8}}>🔔 إشعارات ابنك / ابنتك</div>
          {notifs.length===0&&<div style={{color:'var(--txt3)',textAlign:'center',padding:16,fontSize:13}}>لا توجد إشعارات</div>}
          {notifs.slice(0,10).map(n=>(
            <div key={n.id} style={{padding:'9px 0',borderBottom:'1px solid var(--brd)',fontSize:12}}>
              <div style={{fontWeight:n.read?400:700,fontSize:13}}>{n.msg}</div>
              <div style={{color:'var(--txt3)',fontSize:11,marginTop:2}}>{n.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SemChart({
  attSessions,
  hifzPcts,
  semEvals,
}: {
  attSessions: {present:boolean}[];
  hifzPcts: number[];
  semEvals: (string|null)[];
}) {
  const presentCount = attSessions.filter(s=>s.present).length;
  const absentCount  = attSessions.length - presentCount;
  const attPct       = attSessions.length ? Math.round((presentCount/attSessions.length)*100) : 0;

  const gradeColor = (g: string|null) => {
    if (!g) return '#ccc';
    if (g==='ممتاز'||g==='جيد جداً') return '#2d8a48';
    if (g==='جيد'||g==='متوسط')       return '#b8872a';
    return '#dc2626';
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

      {/* ═════ الحفظ بالتقييم ═════ */}
      <div style={{background:'var(--card)',border:'1.5px solid var(--brd)',borderRadius:18,padding:18}}>
        <div style={{fontWeight:700,fontSize:14,color:'var(--g)',marginBottom:18}}>📖 تطور الحفظ</div>
        <div style={{
          display:'flex',alignItems:'flex-end',justifyContent:'space-around',
          height:220,position:'relative',
          borderBottom:'2px solid var(--brd)',borderRight:'2px solid var(--brd)',
          paddingBottom:10,paddingRight:10,
        }}>
          {/* خطوط المرجع */}
          {[90,70,50,30].map(v=>(
            <div key={v} style={{position:'absolute',bottom:`${v}%`,right:0,left:0,borderTop:'1px dashed #d9d4c7'}}>
              <span style={{position:'absolute',right:-38,top:-10,fontSize:10,color:'var(--txt3)'}}>{v}%</span>
            </div>
          ))}

          {SEMESTERS.map((s,i)=>{
            const grade = semEvals[i];
            const h     = grade ? gradeToH(grade) : (hifzPcts[i] ?? 0);
            const col   = gradeColor(grade);
            const label = grade ?? '—';
            return (
              <div key={s.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,zIndex:2}}>
           
                <div style={{
                  width:55,
                  height:`${Math.max(h,8)*1.8}px`,
                  background:col,
                  borderRadius:'14px 14px 0 0',
                  transition:'0.3s',
                }}/>
                <div style={{fontSize:11,fontWeight:700,color:'var(--txt2)'}}>الفصل {i+1}</div>
                <div style={{fontSize:12,fontWeight:800,color:col}}>{h}%</div>
              </div>
            );
          })}
        </div>

        {/* وسيلة الإيضاح */}
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12,justifyContent:'center'}}>
          {[['ممتاز','#2d8a48','90%'],['جيد','#b8872a','70%'],['متوسط','#b8872a','50%'],['ضعيف','#dc2626','30%']].map(([lbl,col,pct])=>(
            <span key={lbl} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--txt3)'}}>
              <span style={{width:8,height:8,borderRadius:2,background:col,display:'inline-block'}}/>
              {lbl} {pct}
            </span>
          ))}
        </div>
      </div>

      {/* ═════ الحضور ═════ */}
      <div style={{background:'var(--card)',border:'1.5px solid var(--brd)',borderRadius:18,padding:18}}>
        <div style={{fontWeight:700,fontSize:14,color:'var(--g)',marginBottom:18}}>📅 حالة الحضور</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{background:'#eef7f0',border:'1px solid #d4ead9',borderRadius:16,padding:'18px 10px',textAlign:'center'}}>
            <div style={{fontSize:28,fontWeight:800,color:'#2d8a48'}}>{attPct}%</div>
            <div style={{fontSize:12,color:'#2d8a48',fontWeight:700,marginTop:4}}>نسبة الحضور</div>
          </div>
          <div style={{background:'#f8f6f1',border:'1px solid #ece4d2',borderRadius:16,padding:'18px 10px',textAlign:'center'}}>
            <div style={{fontSize:28,fontWeight:800,color:'var(--g)'}}>{attSessions.length}</div>
            <div style={{fontSize:12,color:'var(--txt2)',fontWeight:700,marginTop:4}}>إجمالي الحصص</div>
          </div>
        </div>
        <div style={{display:'flex',gap:12,marginTop:16}}>
          <div style={{flex:1,background:'#eef7f0',borderRadius:14,padding:12,textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:'#2d8a48'}}>{presentCount}</div>
            <div style={{fontSize:11,color:'#2d8a48',fontWeight:700}}>حاضر ✓</div>
          </div>
          <div style={{flex:1,background:'#fff0f0',borderRadius:14,padding:12,textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:'#dc2626'}}>{absentCount}</div>
            <div style={{fontSize:11,color:'#dc2626',fontWeight:700}}>غائب ✕</div>
          </div>
        </div>
      </div>

    </div>
  );
}

function AbsenceLog({ studentId, teacherId }: { studentId: number; teacherId: number }) {
  const [attData, setAttData] = useState<Record<string, { teacherId: number; present: number[]; date?: string }>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () => setAttData(gst('attendance', {}));
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  type AbsenceEntry = { sem: number; month: string; week: number; day: string; date?: string };
  const absences: AbsenceEntry[] = [];

  Object.entries(attData).forEach(([key, rec]) => {
    if (rec.teacherId !== teacherId) return;
    const match = key.match(/^att_\d+_sem(\d+)_m(\d+)_w(\d+)_(.+)$/);
    if (!match) return;
    const sem = parseInt(match[1]);
    const mIdx = parseInt(match[2]);
    const week = parseInt(match[3]);
    const day = match[4];
    const monthName = SEM_MONTHS[sem]?.[mIdx] ?? `شهر ${mIdx+1}`;
    if (!rec.present?.includes(studentId) && rec.present !== undefined) {
      absences.push({ sem, month: monthName, week, day, date: rec.date });
    }
  });

  absences.sort((a, b) => a.sem !== b.sem ? b.sem - a.sem : b.week - a.week);

  const total = absences.length;
  const semMap: Record<number, AbsenceEntry[]> = { 1: [], 2: [], 3: [] };
  absences.forEach(a => semMap[a.sem]?.push(a));

  return (
    <div style={{background:'var(--card)',border:'1.5px solid var(--brd)',borderRadius:16,overflow:'hidden',boxShadow:'var(--sh)'}}>
      <button onClick={()=>setOpen(v=>!v)}
        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',background:'transparent',border:'none',cursor:'pointer',fontFamily:'Cairo,sans-serif'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:20}}>📅</span>
          <span style={{fontWeight:700,fontSize:14,color:'var(--txt)'}}>سجل الغياب</span>
          {total > 0 ? (
            <span style={{background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700}}>{total} يوم غياب</span>
          ) : (
            <span style={{background:'#f0fdf4',color:'#2d8a48',border:'1px solid #86efac',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700}}>لا غياب ✓</span>
          )}
        </div>
        <span style={{fontSize:12,color:'var(--txt3)',display:'inline-block',transition:'0.2s',transform:open?'rotate(180deg)':'none'}}>▼</span>
      </button>

      {open && (
        <div style={{padding:'0 18px 18px'}}>
          {total === 0 ? (
            <div style={{textAlign:'center',padding:'24px 0',color:'var(--txt3)',fontSize:13}}>
              <div style={{fontSize:32,marginBottom:8}}>🎉</div>
              لم يغب هذا الطالب حتى الآن
            </div>
          ) : (
            SEMESTERS.map(s => {
              const list = semMap[s.id];
              if (!list || list.length === 0) return null;
              const byMonth: Record<string, AbsenceEntry[]> = {};
              list.forEach(a => { if (!byMonth[a.month]) byMonth[a.month]=[]; byMonth[a.month].push(a); });
              return (
                <div key={s.id} style={{marginBottom:16}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,paddingBottom:6,borderBottom:'1.5px solid var(--brd)'}}>
                    <span style={{width:10,height:10,borderRadius:'50%',background:s.id===1?'#2d8a48':s.id===2?'#b8872a':'#1d6fa0',display:'inline-block'}}/>
                    <span style={{fontWeight:700,fontSize:13,color:'var(--g)'}}>{s.label}</span>
                    <span style={{marginRight:'auto',background:'#fef2f2',color:'#dc2626',borderRadius:12,padding:'1px 8px',fontSize:11,fontWeight:700}}>{list.length} غياب</span>
                  </div>
                  {Object.entries(byMonth).map(([monthName, entries]) => (
                    <div key={monthName} style={{marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--txt3)',marginBottom:6}}>📆 {monthName}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                        {entries.map((a,i) => (
                          <div key={i} style={{background:'#fff0f0',border:'1px solid #fca5a5',borderRadius:10,padding:'6px 12px',fontSize:12,display:'flex',alignItems:'center',gap:6}}>
                            <span style={{color:'#dc2626',fontWeight:700}}>✕</span>
                            <span style={{fontWeight:600,color:'var(--txt)'}}>{a.day}</span>
                            <span style={{color:'var(--txt3)',fontSize:11}}>الأسبوع {a.week}</span>
                            {a.date && <span style={{background:'var(--gp)',borderRadius:6,padding:'1px 6px',fontSize:10,color:'var(--txt3)'}}>{a.date}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function GuardianPage() {
  const router=useRouter();
  const ready=useSupabaseData();
  const [user,setUser]=useState<AppUser|null>(null);
  const [allStudents,setAllStudents]=useState<Student[]>([]);
  const [student,setStudent]=useState<Student|null>(null);
  const [sem,setSem]=useState(1);
  const [hifzData,setHifzData]=useState<Record<string,HifzRecord[]>>({});
  const [evalData,setEvalData]=useState<Record<string,SemEval>>({});
  const [attData,setAttData]=useState<Record<string,{teacherId:number;present:number[];date?:string}>>({});
  const [sched,setSched]=useState<(ScheduleRow&{teacherName:string;mosqueName:string})[]>([]);

  useEffect(()=>{
    const u=localStorage.getItem('user');
    if(!u){router.replace('/');return;}
    const p:AppUser=JSON.parse(u);
    if(p.role!=='guardian'){router.replace('/');return;}
    setUser(p);
    const t=localStorage.getItem('theme');
    if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
  },[]);

  useEffect(()=>{
    if(!ready||!user) return;
    const load=()=>{
      const dynS=gst<Student[]>('dynamicStudents',[]);
      const all=[...dbStudents,...dynS] as Student[];
      const ids:number[]=[];
      if(user.studentIds&&user.studentIds.length>0) ids.push(...user.studentIds);
      else if(user.studentId) ids.push(user.studentId);
      const dynU=gst<AppUser[]>('dynamicUsers',[]);
      const dynUser=dynU.find(u=>u.id===user.id||u.username===user.username);
      if(dynUser?.studentIds) dynUser.studentIds.forEach(id=>{ if(!ids.includes(id)) ids.push(id); });
      const myStudents=all.filter(s=>ids.includes(s.id));
      setAllStudents(myStudents);
      if(myStudents.length>0&&!student) setStudent(myStudents[0]);
    };
    load();
    window.addEventListener('storage',load);
    return ()=>window.removeEventListener('storage',load);
  },[ready,user]);

  useEffect(()=>{
    const load=()=>{
      setHifzData(gst('hifzRecords',{}));
      setEvalData(gst('semEvals',{}));
      setAttData(gst('attendance',{}));
    };
    load();window.addEventListener('storage',load);
    return ()=>window.removeEventListener('storage',load);
  },[]);

  useEffect(()=>{
    if(!student) return;
    const allT=[...teachers,...gst<Teacher[]>('dynamicTeachers',[])];
    const teacher=allT.find(t=>t.id===student.teacherId);
    const load = () => {
  let found: {rows:ScheduleRow[];sent:boolean} | null = null;
  [1,2,3].forEach(sem => {
    const key = `sentSchedules_t${teacher?.id}_s${sem}`;
    const data = gst<{rows:ScheduleRow[];sent:boolean}|null>(key, null);
    if (data?.sent && data.rows.length > 0) found = data;
  });
  if (found && teacher) {
    setSched((found as any).rows.map((r:any,i:number) => ({
      ...r, id:i, teacherName:teacher.name, mosqueName:teacher.mosqueName
    })));
  } else {
    setSched([]);
  }
};
load();  // ← هنا
window.addEventListener('storage', load);  // ← هنا
return () => window.removeEventListener('storage', load);  // ← هنا
},[student]);
  if(!user||!ready) return null;
  if(allStudents.length===0) return (
    <Layout tab="ch" setTab={()=>{}} user={{...user,role:'guardian'}}>
      <div style={{textAlign:'center',padding:80}}>
        <div style={{fontSize:48,marginBottom:16}}>👶</div>
        <div style={{fontSize:16,color:'var(--txt3)'}}>لا يوجد طلبة مرتبطون بهذا الحساب</div>
      </div>
    </Layout>
  );

  const currentStudent=student||allStudents[0];
  const allT=[...teachers,...gst<Teacher[]>('dynamicTeachers',[])];
  const teacher=allT.find(t=>t.id===currentStudent.teacherId);
  const mosque=mosques.find(m=>m.id===(teacher?.mosqueId||currentStudent.mosqueId));
  const semEval:SemEval|null=evalData[`${currentStudent.id}_${sem}`]||null;
const semSessions=Object.entries(attData).filter(([key,s])=>s.teacherId===teacher?.id&&key.includes(`_sem${sem}_`)).map(([_,s])=>({present:s.present?.includes(currentStudent.id)??false}));  const hifzPcts=SEMESTERS.map(s=>{ const h:HifzRecord[]=hifzData[`${currentStudent.id}_${s.id}`]||[]; return Math.min(h.length*20,100); });
  const semEvals=SEMESTERS.map(s=>evalData[`${currentStudent.id}_${s.id}`]?.grade ?? null);
  const studentIds=allStudents.map(s=>s.id);

  return (
    <Layout tab="ch" setTab={()=>{}} user={{...user,role:'guardian'}} notifSlot={<NotifBell studentIds={studentIds}/>}>
      <div className="main pgin">

        {/* ══ اختيار الابن ══ */}
        {allStudents.length>1&&(
          <div style={{background:'var(--card)',border:'2px solid var(--brd)',borderRadius:'var(--r)',padding:'14px 18px',boxShadow:'var(--sh)'}}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:10,color:'var(--g)',textAlign:'center'}}>
              👨‍👧‍👦 اختر الابن / البنت
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
              {allStudents.map(s=>(
                <button key={s.id} onClick={()=>setStudent(s)}
                  style={{padding:'10px 18px',borderRadius:20,border:'2px solid',fontSize:13,cursor:'pointer',fontFamily:'Cairo,sans-serif',fontWeight:700,transition:'all 0.2s',
                    background:currentStudent.id===s.id?'var(--g)':'var(--card)',color:currentStudent.id===s.id?'#fff':'var(--txt2)',borderColor:currentStudent.id===s.id?'var(--g)':'var(--brd)'}}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ أزرار الفصول ══ */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {SEMESTERS.map(s=>(
              <button key={s.id} onClick={()=>setSem(s.id)}
                style={{padding:'7px 14px',borderRadius:20,border:'1.5px solid',fontSize:12,cursor:'pointer',fontFamily:'Cairo,sans-serif',
                  background:sem===s.id?'var(--g)':'var(--card)',color:sem===s.id?'#fff':'var(--txt2)',borderColor:sem===s.id?'var(--g)':'var(--brd)'}}>
                <div style={{fontWeight:700}}>{s.label}</div>
                <div style={{fontSize:10,opacity:0.8}}>{s.range}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ══ تقرير الفصل ══ */}
        {semEval?(
          <div className="icard" style={{borderLeft:'4px solid var(--g)'}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:'var(--g)'}}>📋 تقرير {SEMESTERS.find(s=>s.id===sem)?.label}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              {semEval.surah&&(<div style={{background:'var(--gp)',borderRadius:8,padding:'10px 12px'}}><div style={{fontSize:10,color:'var(--txt3)',marginBottom:3}}>السورة المحفوظة</div><div style={{fontSize:13,fontWeight:700,color:'var(--g)'}}>{semEval.surah}</div></div>)}
              {semEval.part&&(<div style={{background:'var(--gp)',borderRadius:8,padding:'10px 12px'}}><div style={{fontSize:10,color:'var(--txt3)',marginBottom:3}}>المقدار</div><div style={{fontSize:13,fontWeight:700,color:'var(--g)'}}>{semEval.part}</div></div>)}
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:semEval.notes?10:0}}>
              <div><span style={{fontSize:12,color:'var(--txt3)'}}>التقييم: </span><GradeBadge g={semEval.grade}/></div>
              {semEval.attendance&&(<div style={{background:'var(--gp)',borderRadius:8,padding:'4px 12px',fontSize:12}}>📊 الحضور: <strong>{semEval.attendance}%</strong></div>)}
            </div>
            {semEval.notes&&(<div style={{marginTop:10,background:'var(--gp)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'var(--txt2)',lineHeight:1.6}}>💬 {semEval.notes}</div>)}
            <div style={{fontSize:11,color:'var(--txt3)',marginTop:8}}>صادر بتاريخ: {semEval.date} • المؤطر: {semEval.teacherName||teacher?.name}</div>
          </div>
        ):(
          <div className="icard" style={{textAlign:'center',padding:28}}>
            <div style={{fontSize:28,marginBottom:8}}>⏳</div>
            <div style={{fontSize:13,color:'var(--txt3)'}}>لم يصدر تقرير {SEMESTERS.find(s=>s.id===sem)?.label} بعد</div>
            <div style={{fontSize:11,color:'var(--txt3)',marginTop:4}}>سيصلك إشعار عند صدور التقرير</div>
          </div>
        )}

        {/* ══ منحنى الحضور والحفظ ══ */}
        <div className="icard">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:'var(--g)'}}>📈 منحنى الفصول</div>
          <SemChart attSessions={semSessions} hifzPcts={hifzPcts} semEvals={semEvals}/>
        </div>

        {/* ══ سجل الغياب ══ */}
        <AbsenceLog studentId={currentStudent.id} teacherId={teacher?.id ?? 0} />
{/* ══ جدول التوقيت ══ */}
<div style={{fontWeight:700,fontSize:15,color:'var(--g)'}}>📅 جدول الحصص</div>
{sched.length===0?(
  <div className="icard" style={{textAlign:'center',padding:32}}>
    <div style={{fontSize:32,marginBottom:8}}>📭</div>
    <div style={{fontSize:13,color:'var(--txt3)'}}>لم يتم إرسال جدول بعد</div>
  </div>
):(
  <div style={{background:'var(--card)',border:'1.5px solid var(--brd)',borderRadius:12,overflow:'hidden',boxShadow:'var(--sh)'}}>
    <table style={{width:'100%',borderCollapse:'collapse',direction:'rtl'}}>
      <thead>
        <tr>
          {DAYS.map(day=>(
            <th key={day} style={{
              background:'var(--gp)',
              color:'var(--g)',
              padding:'10px 6px',
              fontSize:12,
              fontWeight:700,
              textAlign:'center',
              border:'1px solid var(--brd)',
            }}>{day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {DAYS.map(day=>{
            const ds=sched.filter(s=>s.day===day);
            return (
              <td key={day} style={{
                background:'#fff',
                border:'1px solid var(--brd)',
                padding:'8px 4px',
                verticalAlign:'top',
                textAlign:'center',
                minHeight:50,
              }}>
                {ds.map((s,i)=>(
                  <div key={i} style={{
                    color:'var(--g)',
                    fontSize:14,
                    fontWeight:800,
                    padding:'4px 2px',
                  }}>{s.startTime}–{s.endTime}</div>
                ))}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  </div>
)}
{/* ══ معلومات المسجد ══ */}
        <div style={{fontWeight:500,fontSize:15,color:'var(--g)'}}><img src="/mosque.png" alt="شعار المسجد"/></div>
        {mosque?(
          <div className="icard" style={{marginBottom:40}}>
            {([['اسم المسجد',mosque.name],['العنوان',mosque.municipality]] as [string,string][]).map(([l,v])=>(
              <div key={l} className="irow"><span className="ilbl">{l}</span><span className="ival">{v}</span></div>
            ))}
            {teacher&&([['المؤطر المسؤول',teacher.name],['رقم الهاتف',teacher.phone||'—']] as [string,string][]).map(([l,v])=>(
              <div key={l} className="irow"><span className="ilbl">{l}</span><span className="ival" style={{direction:'ltr'}}>{v}</span></div>
            ))}
            <div className="mapph">
              <img src="/map.png" alt="خريطة"/>
              <p>عرض موقع المسجد على الخريطة</p>
            </div>
          </div>
        ):(
          <div className="icard" style={{textAlign:'center',padding:24,marginBottom:40}}>
            <div style={{color:'var(--txt3)',fontSize:13}}>معلومات المسجد غير متوفرة</div>
          </div>
        )}

      </div>
    </Layout>
  );
}