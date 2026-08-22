import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import io from 'socket.io-client';
import NavBar from './NavBar';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

let socket;

export default function AppLayout() {
  const { user } = useAuth();
  const [presence, setPresence] = useState(null);

  async function refreshPresence() {
    if (!user) return;
    const { data } = await api.get('/attendance/me', { params: { month: new Date().toISOString().slice(0, 7) } });
    const today = new Date().toISOString().slice(0, 10);
    const todayRecord = data.records.find((r) => r.date.slice(0, 10) === today);
    setPresence(todayRecord?.check_out_time ? 'checked_out' : todayRecord?.check_in_time ? 'present' : null);
  }

  useEffect(() => {
    refreshPresence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!socket) socket = io('/', { path: '/socket.io' });
    socket.on('presence:update', (payload) => {
      if (payload.employeeId === user?.employee_id) {
        setPresence(payload.status === 'present' ? 'present' : 'checked_out');
      }
    });
    return () => socket?.off('presence:update');
  }, [user]);

  async function handleCheckIn() {
    await api.post('/attendance/check-in');
    setPresence('present');
  }

  async function handleCheckOut() {
    await api.post('/attendance/check-out');
    setPresence('checked_out');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar presence={presence} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />
      <Outlet />
    </div>
  );
}
