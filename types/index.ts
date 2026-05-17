export interface Mosque {
  id: number;
  name: string;
  municipality: string;
  imam: string;
  teachersCount: number;
  studentsCount: number;
  progress: number;
}

export interface Teacher {
  id: number;
  name: string;
  rank: string;
  role: string;
  dob: string;
  education: string;
  generation: string;
  phone: string;
  municipality: string;
  mosqueId: number;
  mosqueName: string;
}

export interface Student {
  id: number;
  name: string;
  fatherName: string;
  dob: string;
  gender: 'ذكر' | 'أنثى';
  teacherId: number;
  teacherName: string;
  mosqueId: number;
  mosqueName: string;
  surah: string;
  part: string;
  grade: string;
  progress: number;
  period?: number;
   phone?: string;
}

export interface Schedule {
  id: number;
  teacherId: number;
  teacherName: string;
  mosqueId: number;
  mosqueName: string;
  day: string;
  startTime: string;
  endTime: string;
}

// ✅ AppUser يدعم الأسر مع أكثر من طالبة
export interface AppUser {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'teacher' | 'guardian';
  name: string;
  teacherId?: number;
  studentId?: number;     // legacy
  studentIds?: number[];  // للأسر (واحد أو أكثر)
}

export interface HifzRecord {
  id?: number;
  surah: string;
  part: string;
  grade: string;
  notes: string;
  date: string;
  teacherId?: number;
  period?: number;
}

export interface SemEval {
  surah: string;
  part: string;
  grade: string;
  attendance: string;
  notes: string;
  date: string;
  teacherId?: number;
  semId?: number;
  teacherName?: string;
}

export interface AttRecord {
  date: string;
  teacherId: number;
  present: number[];
}

export interface ScheduleRow {
  id: number;
  day: string;
  startTime: string;
  endTime: string;
  note: string;
}

export interface SentSchedule {
  rows: ScheduleRow[];
  sent: boolean;
  sentDate: string;
  sem?: number;
}

export interface Notif {
  id: number;
  msg: string;
  time: string;
  read: boolean;
  studentId?: number;
  teacherId?: number;
  mosqueId?: number;
  type?: string;

}
