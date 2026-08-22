import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import SalaryTab from '../components/SalaryTab';

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('resume');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await api.get(`/employees/${id}`);
    setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    setTab('resume');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading || !profile) return <div className="max-w-4xl mx-auto px-4 py-6 text-slate-400 text-sm">Loading…</div>;

  const tabs = [
    { key: 'resume', label: 'Resume' },
    ...(profile.editable ? [{ key: 'private', label: 'Private Info' }] : []),
    { key: 'salary', label: 'Salary Info' }, // server enforces visibility; UI just attempts the fetch
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-semibold">
            {profile.first_name[0]}
            {profile.last_name[0]}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="col-span-2">
              <p className="text-lg font-semibold text-slate-800">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-slate-400">{profile.login_id}</p>
            </div>
            <InfoRow label="Job Position" value={profile.job_position} />
            <InfoRow label="Company" value={profile.company_name} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Department" value={profile.department} />
            <InfoRow label="Manager" value={profile.manager_id ? 'Assigned' : '—'} />
            <InfoRow label="Location" value={profile.location} />
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resume' && <ResumeTab profile={profile} />}
      {tab === 'private' && profile.editable && <PrivateInfoTab info={profile.privateInfo} />}
      {tab === 'salary' && <SalaryTab employeeId={id} />}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-slate-700">{value || '—'}</p>
    </div>
  );
}

function ResumeTab({ profile }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 sm:col-span-2">
        <Block title="About" text={profile.resume?.about} />
        <Block title="What I love about my job" text={profile.resume?.what_i_love} />
        <Block title="My interests and hobbies" text={profile.resume?.interests_hobbies} />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Skills</h3>
        {profile.skills?.length ? (
          <ul className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <li key={s.id} className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full">
                {s.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No skills added yet.</p>
        )}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Certification</h3>
        {profile.certifications?.length ? (
          <ul className="flex flex-wrap gap-2">
            {profile.certifications.map((c) => (
              <li key={c.id} className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full">
                {c.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No certifications added yet.</p>
        )}
      </div>
    </div>
  );
}

function Block({ title, text }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-500">{text || 'Not filled in yet.'}</p>
    </div>
  );
}

function PrivateInfoTab({ info }) {
  const rows = [
    ['Date of Birth', info?.date_of_birth],
    ['Residing Address', info?.residing_address],
    ['Nationality', info?.nationality],
    ['Personal Email', info?.personal_email],
    ['Gender', info?.gender],
    ['Marital Status', info?.marital_status],
  ];
  const bank = [
    ['Account Number', info?.bank_account_number],
    ['Bank Name', info?.bank_name],
    ['IFSC Code', info?.ifsc_code],
    ['PAN No', info?.pan_no],
    ['UAN No', info?.uan_no],
    ['Emp Code', info?.emp_code],
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        {rows.map(([label, value]) => (
          <InfoRow key={label} label={label} value={value} />
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Bank Details</h3>
        {bank.map(([label, value]) => (
          <InfoRow key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}
