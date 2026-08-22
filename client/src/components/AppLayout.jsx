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
    try {
      const { data } = await api.get('/attendance/me', {
        params: { month: new Date().toISOString().slice(0, 7) },
      });

      // Match YYYY-MM-DD
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const utcToday = now.toISOString().slice(0, 10);

      const todayRecord = data.records?.find((r) => {
        const dStr = r.formatted_date || (r.date ? String(r.date).slice(0, 10) : '');
        return dStr === localToday || dStr === utcToday;
      });

      if (todayRecord) {
        if (todayRecord.check_out_time) {
          setPresence('checked_out');
        } else if (todayRecord.check_in_time || todayRecord.status === 'present') {
          setPresence('present');
        } else {
          setPresence(null);
        }
      } else {
        setPresence(null);
      }
    } catch (err) {
      console.error('Failed to load presence:', err);
    }
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
    setPresence('present'); // Optimistic update
    try {
      await api.post('/attendance/check-in');
    } catch (err) {
      console.error('Check in error:', err);
    } finally {
      refreshPresence();
    }
  }

  async function handleCheckOut() {
    setPresence('checked_out'); // Optimistic update
    try {
      await api.post('/attendance/check-out');
    } catch (err) {
      console.error('Check out error:', err);
    } finally {
      refreshPresence();
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <NavBar presence={presence} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} />
      <Outlet />
    </div>
  );
}
