import { useEffect, useState } from 'react';
import { api } from '../api/client';

const COMPONENT_LABELS = {
  basic: 'Basic Salary',
  hra: 'House Rent Allowance',
  standard_allowance: 'Standard Allowance',
  performance_bonus: 'Performance Bonus',
  lta: 'Leave Travel Allowance',
  fixed_allowance: 'Fixed Allowance',
};

export default function SalaryTab({ employeeId }) {
  const [data, setData] = useState(null);
  const [notVisible, setNotVisible] = useState(false);
  const [monthWage, setMonthWage] = useState('');
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setNotVisible(false);
    try {
      const { data } = await api.get(`/employees/${employeeId}/salary`);
      setData(data);
      setMonthWage(data.structure?.month_wage || '');
      const v = {};
      data.components.forEach((c) => (v[c.name] = c.value));
      setValues(v);
    } catch {
      // 403 means this viewer (a coworker, not Admin/HR) isn't allowed to see this tab
      setNotVisible(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  if (notVisible) {
    return <p className="text-sm text-slate-400 bg-white border border-slate-200 rounded-xl p-4">Salary info is only visible to Admin/HR and the employee themselves.</p>;
  }
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>;

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    const wage = Number(monthWage);
    if (!wage || wage <= 0) return setError('Enter a valid monthly wage.');
    setSaving(true);
    try {
      const components = Object.entries(values).map(([name, value]) => ({
        name,
        computationType: 'percentage',
        value: Number(value),
      }));
      const { data: result } = await api.put(`/employees/${employeeId}/salary`, {
        monthWage: wage,
        components,
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!data.editable) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex gap-8">
          <Stat label="Month Wage" value={`₹${Number(data.structure?.month_wage || 0).toLocaleString('en-IN')}`} />
          <Stat label="Yearly Wage" value={`₹${Number(data.structure?.yearly_wage || 0).toLocaleString('en-IN')}`} />
        </div>
        <table className="w-full text-sm">
          <tbody>
            {data.components.map((c) => (
              <tr key={c.name} className="border-t border-slate-100">
                <td className="py-2 text-slate-600">{COMPONENT_LABELS[c.name]}</td>
                <td className="py-2 text-right text-slate-400">{Number(c.value).toFixed(2)}%</td>
                <td className="py-2 text-right font-medium text-slate-800 w-28">
                  ₹{Number(c.computed_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400">
          PF: {data.structure?.pf_employee_rate}% (employee) / {data.structure?.pf_employer_rate}% (employer) of Basic ·
          Professional Tax ₹{data.structure?.professional_tax}/month
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Month Wage</label>
          <input
            value={monthWage}
            onChange={(e) => setMonthWage(e.target.value)}
            type="number"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40"
          />
        </div>
        <p className="text-sm text-slate-400 pb-2">
          Yearly: ₹{monthWage ? (Number(monthWage) * 12).toLocaleString('en-IN') : '0'}
        </p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th className="font-medium pb-1">Component</th>
            <th className="font-medium pb-1 text-right">% of Basic</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(COMPONENT_LABELS).map(([name, label]) => (
            <tr key={name} className="border-t border-slate-100">
              <td className="py-2 text-slate-600">{label}</td>
              <td className="py-2 text-right">
                {name === 'basic' ? (
                  <input
                    type="number"
                    value={values[name] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                    className="border border-slate-300 rounded px-2 py-1 text-sm w-20 text-right"
                  />
                ) : name === 'fixed_allowance' ? (
                  <span className="text-xs text-slate-400">auto (remainder)</span>
                ) : (
                  <input
                    type="number"
                    value={values[name] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                    className="border border-slate-300 rounded px-2 py-1 text-sm w-20 text-right"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
      >
        {saving ? 'Saving…' : 'Save Salary Structure'}
      </button>
    </form>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-800">{value}</p>
    </div>
  );
}
