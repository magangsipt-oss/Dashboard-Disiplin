'use client';

import { CalendarDays, Clock } from 'lucide-react';
import { splitClassName } from '@/lib/splitClassName';

// Kolom tanggal/jam dengan ikon yang sama di HP dan laptop. Android menampilkan
// panah bawah, bukan ikon kalender; tampilan bawaan dimatikan lalu diganti ikon
// sendiri. Ikon bawaan browser dibuat transparan selebar kolom sehingga klik di
// mana pun tetap membuka pemilih tanggal.
export default function DateInput({ type = 'date', className = '', ...props }) {
  const { layout, visual } = splitClassName(className);
  const Icon = type === 'time' ? Clock : CalendarDays;
  return (
    <div className={`relative ${layout}`}>
      <input
        {...props}
        type={type}
        className={`${visual} block w-full min-w-0 appearance-none pr-10 text-left [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-date-and-time-value]:text-left`}
      />
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}
