import { useState } from 'react';

const COVERAGE_TYPES = [
  { value: 'Medicare', label: 'Medicare', icon: '🛡️', desc: 'Federal health coverage for 65+' },
  { value: 'Employer', label: 'Insurance through my employer', icon: '💼', desc: 'Group plan from work' },
  { value: 'Covered California', label: 'Covered California (marketplace)', icon: '✓', desc: 'State marketplace plan' },
  { value: 'Individual', label: 'Individual plan', icon: '👤', desc: 'Not through employer or marketplace' },
  { value: 'Medi-Cal', label: 'Medi-Cal', icon: '❤️', desc: "California's Medicaid program" },
  { value: 'Not Sure', label: "I'm not sure", icon: '❓', desc: "We'll help you figure it out" },
];

const MEDICARE_TYPES = [
  { value: 'Medicare Advantage', label: 'Medicare Advantage', desc: 'HMO or PPO through a private company (Kaiser, UHC, Anthem, Humana)' },
  { value: 'Medicare Supplement', label: 'Medicare Supplement / Medigap', desc: 'A separate plan that helps pay what Original Medicare doesn\'t' },
  { value: 'Original Medicare', label: 'Just Original Medicare', desc: 'No extra plan — just Parts A and B' },
  { value: 'Not Sure', label: "I'm not sure", desc: '' },
];

const MEDIGAP_PLANS = ['A', 'B', 'C', 'D', 'F', 'G', 'K', 'L', 'M', 'N', "I don't know"];

const CARRIERS = [
  'Kaiser Permanente',
  'Anthem Blue Cross',
  'Blue Shield of California',
  'Health Net',
  'UnitedHealthcare (UHC)',
  'Aetna',
  'Cigna',
  'Humana',
  'Molina Healthcare',
  'L.A. Care Health Plan',
];

export default function IntakeForm({ onSubmit }) {
  const [coverageType, setCoverageType] = useState('');
  const [medicareType, setMedicareType] = useState('');
  const [medigapPlan, setMedigapPlan] = useState('');
  const [carrier, setCarrier] = useState('');
  const [otherCarrier, setOtherCarrier] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [carrierSearch, setCarrierSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showMedicareType = coverageType === 'Medicare';
  const showMedigap = medicareType === 'Medicare Supplement';
  const skipCarrier = medicareType === 'Original Medicare';
  const showCarrier = coverageType && !skipCarrier;

  const carrierLabel = (coverageType === 'Medicare' && (medicareType === 'Medicare Advantage' || medicareType === 'Medicare Supplement'))
    ? 'Which company provides your Medicare plan?'
    : 'Who is your insurance company?';

  const filteredCarriers = carrierSearch
    ? CARRIERS.filter(c => c.toLowerCase().includes(carrierSearch.toLowerCase()))
    : CARRIERS;

  const canSubmit = coverageType && amount && description && !submitting
    && (!showMedicareType || medicareType)
    && (!showMedigap || medigapPlan)
    && (!showCarrier || carrier || otherCarrier);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    await onSubmit({
      coverageType,
      medicareType: medicareType || undefined,
      medigapPlan: medigapPlan || undefined,
      carrier: carrier === 'Other' ? otherCarrier : carrier || undefined,
      amount,
      description,
    });
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
          Tell us about your insurance issue
        </h2>
        <p className="text-slate-500 text-lg">We'll review your situation and build your action plan.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Coverage Type */}
        <fieldset>
          <legend className="text-lg font-semibold text-slate-700 mb-3">
            What type of health insurance do you have?
          </legend>
          <div className="grid gap-3">
            {COVERAGE_TYPES.map(ct => (
              <button
                type="button"
                key={ct.value}
                onClick={() => { setCoverageType(ct.value); setMedicareType(''); setMedigapPlan(''); setCarrier(''); }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  coverageType === ct.value
                    ? 'border-brand-600 bg-brand-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img">{ct.icon}</span>
                  <div>
                    <div className="font-medium text-slate-800">{ct.label}</div>
                    {ct.desc && <div className="text-sm text-slate-500">{ct.desc}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Medicare Sub-Type */}
        {showMedicareType && (
          <fieldset>
            <legend className="text-lg font-semibold text-slate-700 mb-3">
              What kind of Medicare plan do you have?
            </legend>
            <div className="grid gap-3">
              {MEDICARE_TYPES.map(mt => (
                <button
                  type="button"
                  key={mt.value}
                  onClick={() => { setMedicareType(mt.value); setMedigapPlan(''); setCarrier(''); }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    medicareType === mt.value
                      ? 'border-brand-600 bg-brand-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-800">{mt.label}</div>
                  {mt.desc && <div className="text-sm text-slate-500 mt-0.5">{mt.desc}</div>}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* Medigap Plan Letter */}
        {showMedigap && (
          <div>
            <label className="block text-lg font-semibold text-slate-700 mb-2">
              Which Medigap plan do you have?
            </label>
            <p className="text-sm text-slate-500 mb-3">
              Check your supplement card — it usually shows a letter like "Plan F" or "Plan N"
            </p>
            <select
              value={medigapPlan}
              onChange={e => setMedigapPlan(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-slate-200 bg-white text-lg focus:border-brand-600 focus:outline-none"
            >
              <option value="">Select your plan...</option>
              {MEDIGAP_PLANS.map(p => (
                <option key={p} value={p}>{p === "I don't know" ? p : `Plan ${p}`}</option>
              ))}
            </select>
          </div>
        )}

        {/* Carrier */}
        {showCarrier && (
          <fieldset>
            <legend className="text-lg font-semibold text-slate-700 mb-3">{carrierLabel}</legend>
            <input
              type="text"
              placeholder="Search insurance companies..."
              value={carrierSearch}
              onChange={e => setCarrierSearch(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 mb-3 focus:border-brand-600 focus:outline-none"
            />
            <div className="grid gap-2 max-h-72 overflow-y-auto">
              {filteredCarriers.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => { setCarrier(c); setOtherCarrier(''); setCarrierSearch(''); }}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    carrier === c
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="font-medium">{c}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setCarrier('Other'); setCarrierSearch(''); }}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  carrier === 'Other'
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="font-medium">Other</span>
              </button>
            </div>
            {carrier === 'Other' && (
              <input
                type="text"
                placeholder="Type your insurance company name"
                value={otherCarrier}
                onChange={e => setOtherCarrier(e.target.value)}
                className="w-full mt-3 p-4 rounded-xl border-2 border-slate-200 bg-white text-lg focus:border-brand-600 focus:outline-none"
              />
            )}
          </fieldset>
        )}

        {/* Amount */}
        <div>
          <label className="block text-lg font-semibold text-slate-700 mb-2">
            How much are you being charged or how much was denied?
          </label>
          <p className="text-sm text-slate-500 mb-3">
            Your best estimate is fine. You can find this on your bill or denial letter.
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">$</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full p-4 pl-10 rounded-xl border-2 border-slate-200 bg-white text-xl focus:border-brand-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-lg font-semibold text-slate-700 mb-2">
            Tell us what happened
          </label>
          <p className="text-sm text-slate-500 mb-3">
            Don't worry about including every detail. We'll ask you for what else we need.
          </p>
          <textarea
            maxLength={2000}
            rows={5}
            placeholder="For example: I went to the hospital for surgery and got a bill I wasn't expecting... My insurance denied coverage for an MRI my doctor ordered... I'm getting calls about a medical bill I thought was covered..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-4 rounded-xl border-2 border-slate-200 bg-white text-base leading-relaxed resize-none focus:border-brand-600 focus:outline-none"
          />
          <div className="text-right text-sm text-slate-400 mt-1">{description.length}/2000</div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-4 px-6 rounded-xl text-lg font-semibold text-white transition-all ${
              canSubmit
                ? 'bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/25'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Analyzing your case...' : 'Get My Action Plan'}
          </button>
          <p className="text-center text-sm text-slate-400 mt-3">
            We'll review your situation and tell you exactly what to do next.
          </p>
        </div>
      </form>
    </main>
  );
}
