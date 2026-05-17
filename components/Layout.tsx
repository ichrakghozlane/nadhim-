'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AppUser } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  tab: string;
  setTab: (t: string) => void;
  user: AppUser;
  notifSlot?: React.ReactNode;
  subNav?: React.ReactNode; 
}
export default function Layout({ children, tab, setTab, user, notifSlot, subNav }: LayoutProps) {
  const router = useRouter();
  const [drop, setDrop] = useState(false);
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = localStorage.getItem('theme') || '';
    if (t === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme','dark'); }
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setDrop(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const toggleDark = () => {
    const n = !dark; setDark(n);
    document.documentElement.setAttribute('data-theme', n ? 'dark' : '');
    localStorage.setItem('theme', n ? 'dark' : '');
    setDrop(false);
  };
  // Language toggle removed — app is Arabic only
  const logout = () => { localStorage.removeItem('user'); router.push('/'); };
  const T = { ms:'المساجد', tc:'المؤطرون', st:'الطلبة', sc:'الجداول',
               dk:'الوضع المظلم', lt:'الوضع الفاتح', lo:'تسجيل الخروج',
               admin:'المسؤول العام', teacher:'المؤطر', guardian:'ولي الامر',
               title:'ناظم إدارة مساجد الولاية',
               sub:'إدارة شاملة للمؤطرين والطلبة والجداول الزمنية' };
  const L = T;
  const TABS: Record<string, [string, string][]> = {
    admin:    [['ms',L.ms],['tc',L.tc],['st',L.st],['sc',L.sc],['rp','التقارير']],
    teacher:  [],
    guardian: [],
  };
  const tabs = TABS[user?.role] ?? TABS.admin;
  const displayName = user?.name || L[user?.role] || L.admin;

  return (
    <>
      <div className="page-bg" />
      <div className="page-wrap">
        <header className="hdr">
          <div className="hdr-in">
            {/* يمين */}
            <div className="hdr-r" ref={ref}>
              {notifSlot && <div style={{marginLeft:4}}>{notifSlot}</div>}
              <button className="gear" onClick={() => setDrop(v => !v)} aria-label="إعدادات">⚙️</button>
              <span className="rtag">{displayName}</span>
              {drop && (
                <div className="drop">
                  <div className="drop-hd">{user?.name}</div>
                  <button className="drop-it" onClick={toggleDark}>
                    <span>{dark ? '☀️' : '🌙'}</span>{dark ? L.lt : L.dk}
                  </button>
                  <div className="drop-sep" />
                  <button className="drop-it red" onClick={logout}>
                    <span>🚪</span>{L.lo}
                  </button>
                </div>
              )}
            </div>
            {/* وسط */}
            <div className="hdr-c"><h1>{L.title}</h1><p>{L.sub}</p></div>
            {/* يسار */}
            <div className="hdr-l">
              <img src="/logo.png" alt="ناظم"
                onError={e => { (e.target as HTMLImageElement).src = '/logo2.png'; }} />
            </div>
          </div>
        </header>
        {tabs.length > 0 && (
          <div className="nav">
            <div className="nav-in">
              {tabs.map(([key, label]) => (
                <button key={key} className={`nb ${tab===key?'on':''}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {subNav && subNav}
        <main className="page-wrap">
          <div style={{ paddingLeft:40, paddingRight:40, paddingTop:24 }}>{children}</div>
        </main>
      </div>
    </>
  );
}