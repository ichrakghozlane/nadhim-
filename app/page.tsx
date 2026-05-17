'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AppUser } from '../types';
import { supabase } from '../lib/supabase';

const ROLES = [
  { key:'admin'    as const, label:'المسؤول',   img:'/Admin.png'   },
  { key:'teacher'  as const, label:'المؤطر',    img:'/teacher.png' },
  { key:'guardian' as const, label:'ولي الأمر', img:'/father.png'  },
];

export default function LoginPage() {
  const router = useRouter();
  const [role,     setRole]     = useState<AppUser['role']>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    localStorage.removeItem('user');
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const handleLogin = async () => {
    setError('');
    if (!username || !password) { setError('يرجى إدخال اسم المستخدم وكلمة المرور'); return; }
    setLoading(true);

    const { data, error: dbError } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('role', role)
      .single();

    if (dbError || !data) {
      setError('بيانات غير صحيحة أو الدور غير مطابق');
      setLoading(false);
      return;
    }

    const user: AppUser = {
      id: data.id,
      username: data.username,
      password: data.password,
      role: data.role,
      name: data.name,
      teacherId: data.teacher_id,
      studentIds: data.student_ids,
    };

    localStorage.setItem('user', JSON.stringify(user));
    router.push(user.role === 'guardian' ? '/guardian' : `/${user.role}`);
  };

  return (
    <>
      <div className="login-bg" />
      <div style={{ position:'fixed', inset:0, zIndex:1, background:'rgba(242,237,227,0.45)' }} />
      <div className="login-wrap">
        <div className="lcard">
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <img src="/Logo.png" alt="ناظم"
              style={{ width:100, height:100, display:'block', margin:'0 auto -20px' }}
              className="ico-logo"
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }}/>
            <div style={{ fontFamily:'Amiri,serif', fontSize:30, fontWeight:700, color:'var(--g)', lineHeight:1 }}>ناظم</div>
            <p style={{ color:'var(--g)', fontSize:12, marginTop:6 }}>لإدارة بيانات وأداء التعليم القرآني</p>
          </div>

          <div className="roles">
            {ROLES.map(r => (
              <button key={r.key} className={`role-b ${role===r.key?'on':''}`} onClick={() => setRole(r.key)}>
                <img src={r.img} alt={r.label} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                {r.label}
              </button>
            ))}
          </div>

          <div className="fld">
            <label>اسم المستخدم</label>
            <input className="sinp" style={{ paddingLeft:16 }} type="text"
              placeholder="ادخل اسم المستخدم" value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleLogin()} />
          </div>

          <div className="fld">
            <label>كلمة المرور</label>
            <div style={{ position:'relative' }}>
              <input className="sinp" style={{ paddingLeft:42 }}
                type={showPass ? 'text' : 'password'}
                placeholder="ادخل كلمة المرور" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleLogin()} />
            </div>
          </div>

          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'8px 14px', color:'#dc2626', fontSize:13, marginBottom:12, textAlign:'center' }}>
              ⚠️ {error}
            </div>
          )}

          <button className="btn btn-solid" onClick={handleLogin} disabled={loading}
            style={{ width:'100%', fontSize:15, padding:'12px', borderRadius:10 }}>
            {loading ? '⏳ جاري الدخول...' : 'الدخول إلى النظام'}
          </button>
        </div>
      </div>
    </>
  );
}