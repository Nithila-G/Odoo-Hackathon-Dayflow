import { useEffect, useState } from 'react';
import { api } from '../api/client';

const COMPONENT_LABELS = {
  basic: {
    label: 'Basic Salary',
    subtext: 'Define Basic salary from company cost compute it based on monthly wages',
    unit: '% of Month Wage',
  },
  hra: {
    label: 'House Rent Allowance',
    subtext: 'HRA provided to employees 50% of the basic salary',
    unit: '% of Basic',
  },
  standard_allowance: {
    label: 'Standard Allowance',
    subtext: 'A standard allowance is a predetermined, fixed amount provided to employee as part of their salary',
    unit: '% of Basic',
  },
  performance_bonus: {
    label: 'Performance Bonus',
    subtext: 'Variable amount paid during payroll. The value defined by the company and calculated as a % of the basic salary',
    unit: '% of Basic',
  },
  lta: {
    label: 'Leave Travel Allowance',
    subtext: 'LTA is paid by the company to employees to cover their travel expenses, and calculated as a % of the basic salary',
    unit: '% of Basic',
  },
  fixed_allowance: {
    label: 'Fixed Allowance',
    subtext: 'Fixed allowance portion of wages is determined after calculating all salary components',
    unit: 'auto (remainder)',
  },
};

export default function SalaryTab({ employeeId }) {
  const [data, setData] = useState(null);
  const [notVisible, setNotVisible] = useState(false);

  // Form State
  const [monthWage, setMonthWage] = useState('');
  const [workingDays, setWorkingDays] = useState('5');
  const [breakTime, setBreakTime] = useState('1');
  const [pfEmployeeRate, setPfEmployeeRate] = useState('12');
  const [pfEmployerRate, setPfEmployerRate] = useState('12');
  const [professionalTax, setProfessionalTax] = useState('200');

  // Component percentages
  const [values, setValues] = useState({
    basic: '50',
    hra: '50',
    standard_allowance: '16.67',
    performance_bonus: '8.33',
    lta: '8.33',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setNotVisible(false);
    try {
      const { data } = await api.get(`/employees/${employeeId}/salary`);
      setData(data);
      if (data.structure) {
        setMonthWage(data.structure.month_wage || '');
        setWorkingDays(data.structure.working_days_per_week || '5');
        setBreakTime(data.structure.break_time_hours || '1');
        setPfEmployeeRate(data.structure.pf_employee_rate || '12');
        setPfEmployerRate(data.structure.pf_employer_rate || '12');
        setProfessionalTax(data.structure.professional_tax || '200');
      }
      if (data.components?.length) {
        const v = {};
        data.components.forEach((c) => (v[c.name] = c.value));
        setValues((old) => ({ ...old, ...v }));
      }
    } catch {
      setNotVisible(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  if (notVisible) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500 text-sm text-center">
        Salary Information tab is only visible to Admin / HR and authorized accounts.
      </div>
    );
  }

  if (!data) return <p className="text-sm text-slate-400">Loading salary structure…</p>;

  // Real-time calculations for preview
  const wageNum = Number(monthWage) || 0;
  const yearlyWage = wageNum * 12;

  const basicRate = Number(values.basic) || 0;
  const basicAmt = (wageNum * basicRate) / 100;

  const hraRate = Number(values.hra) || 0;
  const hraAmt = (basicAmt * hraRate) / 100;

  const stdRate = Number(values.standard_allowance) || 0;
  const stdAmt = (basicAmt * stdRate) / 100;

  const perfRate = Number(values.performance_bonus) || 0;
  const perfAmt = (basicAmt * perfRate) / 100;

  const ltaRate = Number(values.lta) || 0;
  const ltaAmt = (basicAmt * ltaRate) / 100;

  const sumOther = basicAmt + hraAmt + stdAmt + perfAmt + ltaAmt;
  const fixedAmt = Math.max(0, wageNum - sumOther);
  const fixedRate = wageNum > 0 ? (fixedAmt / wageNum) * 100 : 0;

  const pfEmpRateNum = Number(pfEmployeeRate) || 0;
  const pfEmpAmt = (basicAmt * pfEmpRateNum) / 100;

  const pfEmprRateNum = Number(pfEmployerRate) || 0;
  const pfEmprAmt = (basicAmt * pfEmprRateNum) / 100;

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!wageNum || wageNum <= 0) return setError('Please enter a valid monthly wage amount.');

    setSaving(true);
    try {
      const components = [
        { name: 'basic', computationType: 'percentage', value: Number(values.basic) },
        { name: 'hra', computationType: 'percentage', value: Number(values.hra) },
        { name: 'standard_allowance', computationType: 'percentage', value: Number(values.standard_allowance) },
        { name: 'performance_bonus', computationType: 'percentage', value: Number(values.performance_bonus) },
        { name: 'lta', computationType: 'percentage', value: Number(values.lta) },
        { name: 'fixed_allowance', computationType: 'percentage', value: 0 },
      ];

      await api.put(`/employees/${employeeId}/salary`, {
        monthWage: wageNum,
        workingDaysPerWeek: Number(workingDays),
        breakTimeHours: Number(breakTime),
        pfEmployeeRate: Number(pfEmployeeRate),
        pfEmployerRate: Number(pfEmployerRate),
        professionalTax: Number(professionalTax),
        components,
      });

      await load();
    } catch (err) {
      setError(err.message || 'Could not save salary structure');
    } finally {
      setSaving(false);
    }
  }

  const isEditable = data.editable;

  return (
    <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs">
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-base font-bold text-slate-800">Salary Info</h2>
        <p className="text-xs text-slate-400">Salary Info tab should only be visible to Admin</p>
      </div>

      {/* Top Section: Month Wage, Yearly Wage, Working Days, Break Time */}
      <div className="grid sm:grid-cols-2 gap-6 bg-slate-50 border border-slate-200/80 rounded-xl p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">Month Wage</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">₹</span>
              <input
                type="number"
                disabled={!isEditable}
                value={monthWage}
                onChange={(e) => setMonthWage(e.target.value)}
                placeholder="50000"
                className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-right focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
              <span className="text-xs text-slate-500 font-medium">/ Month</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">Yearly wage</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-brand-700">
                ₹{yearlyWage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ Yearly</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">No of working days in a week:</label>
            <input
              type="number"
              min="1"
              max="7"
              disabled={!isEditable}
              value={workingDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-xs text-center font-medium bg-white"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600">Break Time:</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.5"
                min="0"
                max="8"
                disabled={!isEditable}
                value={breakTime}
                onChange={(e) => setBreakTime(e.target.value)}
                className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-xs text-center font-medium bg-white"
              />
              <span className="text-xs text-slate-500 font-medium">/hrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Components Section */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 border-b pb-1">Salary Components</h3>

        <div className="space-y-3">
          {/* Basic Salary */}
          <ComponentRow
            label={COMPONENT_LABELS.basic.label}
            subtext={COMPONENT_LABELS.basic.subtext}
            amount={basicAmt}
            rate={values.basic}
            onRateChange={(val) => setValues((v) => ({ ...v, basic: val }))}
            rateLabel="% of Wage"
            editable={isEditable}
          />

          {/* House Rent Allowance */}
          <ComponentRow
            label={COMPONENT_LABELS.hra.label}
            subtext={COMPONENT_LABELS.hra.subtext}
            amount={hraAmt}
            rate={values.hra}
            onRateChange={(val) => setValues((v) => ({ ...v, hra: val }))}
            rateLabel="% of Basic"
            editable={isEditable}
          />

          {/* Standard Allowance */}
          <ComponentRow
            label={COMPONENT_LABELS.standard_allowance.label}
            subtext={COMPONENT_LABELS.standard_allowance.subtext}
            amount={stdAmt}
            rate={values.standard_allowance}
            onRateChange={(val) => setValues((v) => ({ ...v, standard_allowance: val }))}
            rateLabel="% of Basic"
            editable={isEditable}
          />

          {/* Performance Bonus */}
          <ComponentRow
            label={COMPONENT_LABELS.performance_bonus.label}
            subtext={COMPONENT_LABELS.performance_bonus.subtext}
            amount={perfAmt}
            rate={values.performance_bonus}
            onRateChange={(val) => setValues((v) => ({ ...v, performance_bonus: val }))}
            rateLabel="% of Basic"
            editable={isEditable}
          />

          {/* Leave Travel Allowance */}
          <ComponentRow
            label={COMPONENT_LABELS.lta.label}
            subtext={COMPONENT_LABELS.lta.subtext}
            amount={ltaAmt}
            rate={values.lta}
            onRateChange={(val) => setValues((v) => ({ ...v, lta: val }))}
            rateLabel="% of Basic"
            editable={isEditable}
          />

          {/* Fixed Allowance (Remainder) */}
          <div className="flex items-start justify-between py-2 border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-800">{COMPONENT_LABELS.fixed_allowance.label}</p>
              <p className="text-[11px] text-slate-400 max-w-md">{COMPONENT_LABELS.fixed_allowance.subtext}</p>
            </div>
            <div className="flex items-center gap-4 text-right">
              <span className="text-sm font-bold text-slate-800">
                ₹{fixedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">/ month</span>
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {fixedRate.toFixed(2)} %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Provident Fund (PF) & Tax Deductions Grid */}
      <div className="grid sm:grid-cols-2 gap-6 pt-2">
        {/* PF Contribution */}
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b pb-1">
            Provident Fund (PF) Contribution
          </h3>

          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-700">Employee</p>
              <p className="text-[10px] text-slate-400">PF calculated based on basic salary</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                ₹{pfEmpAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
              </span>
              <input
                type="number"
                disabled={!isEditable}
                value={pfEmployeeRate}
                onChange={(e) => setPfEmployeeRate(e.target.value)}
                className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right font-medium bg-white"
              />
              <span className="text-slate-500 font-medium">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-700">Employer</p>
              <p className="text-[10px] text-slate-400">PF calculated based on basic salary</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                ₹{pfEmprAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
              </span>
              <input
                type="number"
                disabled={!isEditable}
                value={pfEmployerRate}
                onChange={(e) => setPfEmployerRate(e.target.value)}
                className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right font-medium bg-white"
              />
              <span className="text-slate-500 font-medium">%</span>
            </div>
          </div>
        </div>

        {/* Tax Deductions */}
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b pb-1">
            Tax Deductions
          </h3>

          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-700">Professional Tax</p>
              <p className="text-[10px] text-slate-400">Professional Tax deducted from Gross salary</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">₹</span>
              <input
                type="number"
                disabled={!isEditable}
                value={professionalTax}
                onChange={(e) => setProfessionalTax(e.target.value)}
                className="w-20 border border-slate-300 rounded px-2 py-0.5 text-xs text-right font-medium bg-white"
              />
              <span className="text-slate-500 font-medium">/ month</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

      {isEditable && (
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm transition-colors"
          >
            {saving ? 'Saving Salary Structure…' : 'Save Salary Structure'}
          </button>
        </div>
      )}
    </form>
  );
}

function ComponentRow({ label, subtext, amount, rate, onRateChange, editable }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-100 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-400 max-w-md">{subtext}</p>
      </div>

      <div className="flex items-center gap-3 text-right">
        <span className="text-sm font-bold text-slate-800">
          ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <span className="text-xs font-normal text-slate-500">/ month</span>
        </span>

        {editable ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              value={rate ?? ''}
              onChange={(e) => onRateChange(e.target.value)}
              className="w-16 border border-slate-300 rounded px-2 py-1 text-xs text-right font-semibold bg-white"
            />
            <span className="text-xs text-slate-500 font-medium">%</span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {Number(rate).toFixed(2)} %
          </span>
        )}
      </div>
    </div>
  );
}
