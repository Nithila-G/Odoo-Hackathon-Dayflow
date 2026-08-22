import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import SalaryTab from '../components/SalaryTab';

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('resume');
  const [loading, setLoading] = useState(true);
  const [uploadingPic, setUploadingPic] = useState(false);
  const avatarFileRef = useRef(null);

  async function load() {
    try {
      const { data } = await api.get(`/employees/${id}`);
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setTab('resume');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingPic(true);

    try {
      // If user has token, /uploads-api is accessible
      const { data } = await api.post('/uploads-api', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.patch(`/employees/${id}`, { profilePictureUrl: data.url });
      await load();
    } catch (err) {
      alert(err.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPic(false);
    }
  }

  if (loading || !profile) return <div className="max-w-4xl mx-auto px-4 py-6 text-slate-400 text-sm">Loading…</div>;

  const tabs = [
    { key: 'resume', label: 'Resume' },
    ...(profile.editable ? [{ key: 'private', label: 'Private Info' }] : []),
    { key: 'salary', label: 'Salary Info' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 shadow-xs">
        <div className="flex items-center gap-5">
          {/* Avatar Circle with Pencil Edit Icon */}
          <div className="relative group">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={`${profile.first_name} ${profile.last_name}`}
                className="w-20 h-20 rounded-full object-cover border-2 border-brand-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold border-2 border-brand-200">
                {profile.first_name?.[0]}
                {profile.last_name?.[0]}
              </div>
            )}

            {profile.editable && (
              <>
                <input
                  type="file"
                  ref={avatarFileRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={uploadingPic}
                  title="Upload / Edit Profile Picture"
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full shadow-md transition-transform hover:scale-105 focus:outline-none"
                >
                  {uploadingPic ? (
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Profile Basic Info */}
          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="col-span-2">
              <p className="text-xl font-bold text-slate-800">
                {profile.first_name} {profile.last_name}
              </p>
              <p className="text-xs text-brand-600 font-medium tracking-wide">{profile.login_id}</p>
            </div>
            <InfoRow label="Job Position" value={profile.job_position} />
            <InfoRow label="Company" value={profile.company_name} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Department" value={profile.department} />
            <InfoRow label="Phone" value={profile.phone} />
            <InfoRow label="Location" value={profile.location} />
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resume' && <ResumeTab profile={profile} onReload={load} />}
      {tab === 'private' && profile.editable && <PrivateInfoTab profile={profile} onReload={load} />}
      {tab === 'salary' && <SalaryTab employeeId={id} />}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-slate-700 font-medium">{value || '—'}</p>
    </div>
  );
}

/* =========================================================================
   RESUME TAB (With Pencil Icons ✏️ & Editable Skills/Certifications)
   ========================================================================= */
function ResumeTab({ profile, onReload }) {
  const [editingField, setEditingField] = useState(null); // 'about' | 'what_i_love' | 'interests_hobbies'
  const [textValue, setTextValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Skill input state
  const [newSkill, setNewSkill] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);

  // Certification input state
  const [newCert, setNewCert] = useState('');
  const [addingCert, setAddingCert] = useState(false);

  function startEdit(fieldKey, currentValue) {
    if (!profile.editable) return;
    setEditingField(fieldKey);
    setTextValue(currentValue || '');
  }

  async function handleSaveText() {
    if (!editingField) return;
    setSaving(true);
    try {
      const payload = {};
      if (editingField === 'about') payload.about = textValue;
      if (editingField === 'what_i_love') payload.whatILove = textValue;
      if (editingField === 'interests_hobbies') payload.interestsHobbies = textValue;

      await api.patch(`/employees/${profile.id}`, payload);
      await onReload();
      setEditingField(null);
    } catch (err) {
      alert(err.message || 'Failed to update section');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSkill(e) {
    e.preventDefault();
    if (!newSkill.trim()) return;
    setAddingSkill(true);
    try {
      await api.post(`/employees/${profile.id}/skills`, { name: newSkill.trim() });
      setNewSkill('');
      await onReload();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingSkill(false);
    }
  }

  async function handleDeleteSkill(skillId) {
    try {
      await api.delete(`/employees/${profile.id}/skills/${skillId}`);
      await onReload();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddCert(e) {
    e.preventDefault();
    if (!newCert.trim()) return;
    setAddingCert(true);
    try {
      await api.post(`/employees/${profile.id}/certifications`, { name: newCert.trim() });
      setNewCert('');
      await onReload();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingCert(false);
    }
  }

  async function handleDeleteCert(certId) {
    try {
      await api.delete(`/employees/${profile.id}/certifications/${certId}`);
      await onReload();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Resume Text Blocks */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 sm:col-span-2 shadow-xs">
        <EditableBlock
          title="About"
          fieldKey="about"
          value={profile.resume?.about}
          isEditing={editingField === 'about'}
          editable={profile.editable}
          textValue={textValue}
          setTextValue={setTextValue}
          saving={saving}
          onStartEdit={() => startEdit('about', profile.resume?.about)}
          onSave={handleSaveText}
          onCancel={() => setEditingField(null)}
        />

        <EditableBlock
          title="What I love about my job"
          fieldKey="what_i_love"
          value={profile.resume?.what_i_love}
          isEditing={editingField === 'what_i_love'}
          editable={profile.editable}
          textValue={textValue}
          setTextValue={setTextValue}
          saving={saving}
          onStartEdit={() => startEdit('what_i_love', profile.resume?.what_i_love)}
          onSave={handleSaveText}
          onCancel={() => setEditingField(null)}
        />

        <EditableBlock
          title="My interests and hobbies"
          fieldKey="interests_hobbies"
          value={profile.resume?.interests_hobbies}
          isEditing={editingField === 'interests_hobbies'}
          editable={profile.editable}
          textValue={textValue}
          setTextValue={setTextValue}
          saving={saving}
          onStartEdit={() => startEdit('interests_hobbies', profile.resume?.interests_hobbies)}
          onSave={handleSaveText}
          onCancel={() => setEditingField(null)}
        />
      </div>

      {/* Skills Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Skills</h3>
        </div>

        {profile.skills?.length ? (
          <ul className="flex flex-wrap gap-2 mb-4">
            {profile.skills.map((s) => (
              <li
                key={s.id}
                className="group inline-flex items-center gap-1.5 text-xs bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1 rounded-full font-medium"
              >
                <span>{s.name}</span>
                {profile.editable && (
                  <button
                    onClick={() => handleDeleteSkill(s.id)}
                    className="text-brand-400 hover:text-red-600 transition-colors"
                    title="Remove Skill"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400 mb-4">No skills added yet.</p>
        )}

        {profile.editable && (
          <form onSubmit={handleAddSkill} className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add skill (e.g. React, Python)"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={addingSkill || !newSkill.trim()}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Skill
            </button>
          </form>
        )}
      </div>

      {/* Certification Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Certification</h3>
        </div>

        {profile.certifications?.length ? (
          <ul className="flex flex-wrap gap-2 mb-4">
            {profile.certifications.map((c) => (
              <li
                key={c.id}
                className="group inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium"
              >
                <span>{c.name}</span>
                {profile.editable && (
                  <button
                    onClick={() => handleDeleteCert(c.id)}
                    className="text-emerald-400 hover:text-red-600 transition-colors"
                    title="Remove Certification"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400 mb-4">No certifications added yet.</p>
        )}

        {profile.editable && (
          <form onSubmit={handleAddCert} className="flex gap-2">
            <input
              type="text"
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              placeholder="Add certification (e.g. AWS Certified)"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={addingCert || !newCert.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Certification
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* Helper Editable Section Block with Pencil Icon ✏️ */
function EditableBlock({
  title,
  value,
  isEditing,
  editable,
  textValue,
  setTextValue,
  saving,
  onStartEdit,
  onSave,
  onCancel,
}) {
  return (
    <div className="group border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2 mb-1.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {editable && !isEditing && (
          <button
            onClick={onStartEdit}
            title={`Edit ${title}`}
            className="text-slate-400 hover:text-brand-600 transition-colors p-1 rounded hover:bg-slate-100"
          >
            {/* Pencil Icon ✏️ */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder={`Enter details about ${title.toLowerCase()}…`}
          />
          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600 whitespace-pre-line">
          {value || <span className="text-slate-400 italic">Not filled in yet. Click ✏️ to add.</span>}
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   PRIVATE INFO TAB (Editable Private Details)
   ========================================================================= */
function PrivateInfoTab({ profile, onReload }) {
  const info = profile.privateInfo || {};
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    dateOfBirth: info.date_of_birth || '',
    residingAddress: info.residing_address || '',
    nationality: info.nationality || '',
    personalEmail: info.personal_email || '',
    gender: info.gender || '',
    maritalStatus: info.marital_status || '',
    bankAccountNumber: info.bank_account_number || '',
    bankName: info.bank_name || '',
    ifscCode: info.ifsc_code || '',
    panNo: info.pan_no || '',
    uanNo: info.uan_no || '',
    empCode: info.emp_code || '',
    phone: profile.phone || '',
  });

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/employees/${profile.id}`, form);
      await onReload();
      setEditing(false);
    } catch (err) {
      alert(err.message || 'Failed to update private info');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-semibold text-slate-800">Edit Private Information</h3>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Date of Birth">
            <input type="date" value={form.dateOfBirth} onChange={updateField('dateOfBirth')} className={inputStyle} />
          </FormField>
          <FormField label="Personal Email">
            <input type="email" value={form.personalEmail} onChange={updateField('personalEmail')} className={inputStyle} />
          </FormField>
          <FormField label="Phone">
            <input type="text" value={form.phone} onChange={updateField('phone')} className={inputStyle} />
          </FormField>
          <FormField label="Nationality">
            <input type="text" value={form.nationality} onChange={updateField('nationality')} className={inputStyle} />
          </FormField>
          <FormField label="Gender">
            <select value={form.gender} onChange={updateField('gender')} className={inputStyle}>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
          <FormField label="Marital Status">
            <select value={form.maritalStatus} onChange={updateField('maritalStatus')} className={inputStyle}>
              <option value="">Select Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Residing Address">
              <input type="text" value={form.residingAddress} onChange={updateField('residingAddress')} className={inputStyle} />
            </FormField>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Bank Details & Official Numbers</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Bank Account Number">
              <input type="text" value={form.bankAccountNumber} onChange={updateField('bankAccountNumber')} className={inputStyle} />
            </FormField>
            <FormField label="Bank Name">
              <input type="text" value={form.bankName} onChange={updateField('bankName')} className={inputStyle} />
            </FormField>
            <FormField label="IFSC Code">
              <input type="text" value={form.ifscCode} onChange={updateField('ifscCode')} className={inputStyle} />
            </FormField>
            <FormField label="PAN No">
              <input type="text" value={form.panNo} onChange={updateField('panNo')} className={inputStyle} />
            </FormField>
            <FormField label="UAN No">
              <input type="text" value={form.uanNo} onChange={updateField('uanNo')} className={inputStyle} />
            </FormField>
            <FormField label="Emp Code">
              <input type="text" value={form.empCode} onChange={updateField('empCode')} className={inputStyle} />
            </FormField>
          </div>
        </div>
      </form>
    );
  }

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
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          Edit Private Info
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">Personal Details</h3>
          {rows.map(([label, value]) => (
            <InfoRow key={label} label={label} value={value} />
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-800 border-b pb-2">Bank Details & Official Numbers</h3>
          {bank.map(([label, value]) => (
            <InfoRow key={label} label={label} value={value} />
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle =
  'w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500';

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
