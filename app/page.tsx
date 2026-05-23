"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarDays, Edit3, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { dateLabel, DEFAULT_REMINDER_DAYS, getUpcomingReminders, moneyLabel } from "@/lib/dates";
import { POLICY_TYPES, type Policy, type PolicyInput } from "@/types/policy";

const emptyForm: PolicyInput = {
  policy_name: "",
  provider: "",
  policy_number: "",
  policy_type: "Health",
  premium_amount: null,
  premium_due_date: "",
  billing_frequency: "quarterly",
  expiry_date: "",
  notes: "",
  reminder_days: DEFAULT_REMINDER_DAYS,
  user_email: "",
  is_active: true
};

function toForm(policy: Policy): PolicyInput {
  return {
    policy_name: policy.policy_name,
    provider: policy.provider,
    policy_number: policy.policy_number ?? "",
    policy_type: policy.policy_type,
    premium_amount: policy.premium_amount,
    premium_due_date: policy.premium_due_date ?? "",
    billing_frequency: policy.billing_frequency ?? "one_time",
    expiry_date: policy.expiry_date ?? "",
    notes: policy.notes ?? "",
    reminder_days: policy.reminder_days,
    user_email: policy.user_email,
    is_active: policy.is_active
  };
}

export default function HomePage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [form, setForm] = useState<PolicyInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reminders = useMemo(() => getUpcomingReminders(policies), [policies]);
  const overdueCount = reminders.filter((item) => item.isOverdue).length;
  const todayCount = reminders.filter((item) => item.isToday).length;

  async function loadPolicies() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/policies", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load policies");
      setPolicies(payload.policies);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load policies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  function updateForm<K extends keyof PolicyInput>(key: K, value: PolicyInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  }

  async function savePolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const url = editingId ? `/api/policies/${editingId}` : "/api/policies";
    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save policy");
      await loadPolicies();
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save policy");
    } finally {
      setSaving(false);
    }
  }

  async function deletePolicy(id: string) {
    const confirmed = window.confirm("Delete this policy?");
    if (!confirmed) return;

    setError("");
    const response = await fetch(`/api/policies/${id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Unable to delete policy");
      return;
    }
    setPolicies((current) => current.filter((policy) => policy.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Insurance reminders</h1>
          <p>Track premiums, expiry dates, and emails from one practical dashboard.</p>
        </div>
        <button className="secondary-button" onClick={loadPolicies} type="button" title="Refresh policies">
          <RefreshCw size={18} />
          Refresh
        </button>
      </header>

      <section className="layout-grid">
        <div>
          <div className="summary-grid">
            <div className="metric">
              <span>Active policies</span>
              <strong>{policies.filter((policy) => policy.is_active).length}</strong>
            </div>
            <div className="metric">
              <span>Due today</span>
              <strong>{todayCount}</strong>
            </div>
            <div className="metric">
              <span>Overdue</span>
              <strong>{overdueCount}</strong>
            </div>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Upcoming reminders</h2>
                <p>Premium and expiry reminders in the next 45 days.</p>
              </div>
              <span className="badge">{reminders.length} scheduled</span>
            </div>
            <div className="reminder-list">
              {loading ? <div className="empty">Loading reminders...</div> : null}
              {!loading && reminders.length === 0 ? <div className="empty">No upcoming reminders yet.</div> : null}
              {reminders.slice(0, 8).map((reminder) => (
                <article
                  className={`reminder-row ${reminder.isOverdue ? "overdue" : ""} ${reminder.isToday ? "today" : ""}`}
                  key={`${reminder.policy.id}-${reminder.kind}-${reminder.targetDate}-${reminder.daysBefore}`}
                >
                  <div>
                    <div className="row-title">
                      {reminder.isOverdue ? <AlertTriangle size={18} /> : <Bell size={18} />}
                      <strong>{reminder.policy.policy_name}</strong>
                      <span className={`badge ${reminder.isOverdue ? "danger" : reminder.isToday ? "warn" : ""}`}>
                        {reminder.isOverdue ? "Overdue" : reminder.isToday ? "Today" : `${reminder.daysBefore} days before`}
                      </span>
                    </div>
                    <div className="row-meta">
                      <span>{reminder.kind === "premium_due" ? "Premium due" : "Expires"}: {dateLabel(reminder.targetDate)}</span>
                      <span>{reminder.policy.provider}</span>
                      <span>{moneyLabel(reminder.policy.premium_amount)}</span>
                    </div>
                  </div>
                  <span className="badge">Email {dateLabel(reminder.reminderDate)}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel-header">
              <div>
                <h2>Policies</h2>
                <p>Add, edit, delete, and review reminder settings.</p>
              </div>
              <button className="primary-button" type="button" onClick={resetForm}>
                <Plus size={18} />
                Add policy
              </button>
            </div>
            <div className="policy-list">
              {!loading && policies.length === 0 ? <div className="empty">Add your first policy to start tracking reminders.</div> : null}
              {policies.map((policy) => (
                <article className="policy-row" key={policy.id}>
                  <div>
                    <div className="row-title">
                      <ShieldCheck size={18} />
                      <strong>{policy.policy_name}</strong>
                      <span className="badge">{policy.policy_type}</span>
                    </div>
                    <div className="policy-meta">
                      <span>{policy.provider}</span>
                      <span>Policy #{policy.policy_number || "Not set"}</span>
                      <span>Due {dateLabel(policy.premium_due_date)}</span>
                      <span>{policy.billing_frequency === "quarterly" ? "Quarterly" : "One-time"}</span>
                      <span>Expires {dateLabel(policy.expiry_date)}</span>
                      <span>{moneyLabel(policy.premium_amount)}</span>
                    </div>
                  </div>
                  <div className="policy-actions">
                    <button
                      className="icon-button"
                      type="button"
                      title="Edit policy"
                      onClick={() => {
                        setEditingId(policy.id);
                        setForm(toForm(policy));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <Edit3 size={18} />
                    </button>
                    <button className="icon-button" type="button" title="Delete policy" onClick={() => deletePolicy(policy.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="panel form-panel">
          <div className="panel-header">
            <div>
              <h2>{editingId ? "Edit policy" : "Add policy"}</h2>
              <p>Reminder emails use the address saved with each policy.</p>
            </div>
          </div>
          <form className="policy-form" onSubmit={savePolicy}>
            {error ? <div className="error">{error}</div> : null}

            <div className="field">
              <label htmlFor="policy_name">Policy name</label>
              <input id="policy_name" required value={form.policy_name} onChange={(event) => updateForm("policy_name", event.target.value)} />
            </div>

            <div className="two-col">
              <div className="field">
                <label htmlFor="provider">Provider</label>
                <input id="provider" required value={form.provider} onChange={(event) => updateForm("provider", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="policy_type">Type</label>
                <select id="policy_type" value={form.policy_type} onChange={(event) => updateForm("policy_type", event.target.value as PolicyInput["policy_type"])}>
                  {POLICY_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="user_email">Reminder email</label>
              <input id="user_email" required type="email" value={form.user_email} onChange={(event) => updateForm("user_email", event.target.value)} />
            </div>

            <div className="two-col">
              <div className="field">
                <label htmlFor="policy_number">Policy number</label>
                <input id="policy_number" value={form.policy_number ?? ""} onChange={(event) => updateForm("policy_number", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="premium_amount">Premium amount</label>
                <input
                  id="premium_amount"
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.premium_amount ?? ""}
                  onChange={(event) => updateForm("premium_amount", event.target.value ? Number(event.target.value) : null)}
                />
              </div>
            </div>

            <div className="two-col">
              <div className="field">
                <label htmlFor="premium_due_date">Premium due date</label>
                <input id="premium_due_date" type="date" value={form.premium_due_date ?? ""} onChange={(event) => updateForm("premium_due_date", event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="billing_frequency">Premium cycle</label>
                <select id="billing_frequency" value={form.billing_frequency} onChange={(event) => updateForm("billing_frequency", event.target.value as PolicyInput["billing_frequency"])}>
                  <option value="quarterly">Quarterly</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
            </div>

            <div className="two-col">
              <div className="field">
                <label htmlFor="expiry_date">Expiry date</label>
                <input id="expiry_date" type="date" value={form.expiry_date ?? ""} onChange={(event) => updateForm("expiry_date", event.target.value)} />
              </div>
            </div>

            <div>
              <div className="fieldset-label">Reminder days</div>
              <div className="checks">
                {DEFAULT_REMINDER_DAYS.map((day) => (
                  <label className="check" key={day}>
                    <input
                      checked={form.reminder_days.includes(day)}
                      type="checkbox"
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...form.reminder_days, day]
                          : form.reminder_days.filter((item) => item !== day);
                        updateForm("reminder_days", next.sort((a, b) => b - a));
                      }}
                    />
                    {day === 0 ? "Due date" : `${day} days before`}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" value={form.notes ?? ""} onChange={(event) => updateForm("notes", event.target.value)} />
            </div>

            <label className="check">
              <input checked={form.is_active} type="checkbox" onChange={(event) => updateForm("is_active", event.target.checked)} />
              Active policy
            </label>

            <div className="form-actions">
              {editingId ? (
                <button className="secondary-button" type="button" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
              <button className="primary-button" disabled={saving} type="submit">
                <CalendarDays size={18} />
                {saving ? "Saving..." : editingId ? "Save changes" : "Save policy"}
              </button>
            </div>
          </form>
        </aside>
      </section>
    </main>
  );
}
