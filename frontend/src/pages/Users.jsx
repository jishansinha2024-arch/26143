import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, ShieldCheck, Ban, CheckCircle2, Check, X } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EmailSettings } from "@/components/admin/EmailSettings";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };
const ROLE_COLOR = { viewer: "#007bb9", analyst: "#006194", supervisor: "#b26a00", admin: "#ba1a1a" };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [resets, setResets] = useState(null);
  const [reqs, setReqs] = useState(null);
  const [f, setF] = useState({ email: "", name: "", role: "viewer", password: "" });
  const [busy, setBusy] = useState(false);
  const load = () => Promise.all([api.get("/users"), api.get("/auth/reset-requests"), api.get("/role-requests")]).then(([u, r, rq]) => { setUsers(u.data); setResets(r.data); setReqs(rq.data); }).catch((e) => { setUsers([]); toast.error(apiError(e)); });
  useEffect(() => { load(); }, []);

  const decide = async (id, action, email) => {
    if (action === "approve" && !window.confirm(`Approve elevated access for ${email}?`)) return;
    try { await api.post(`/role-requests/${id}/${action}`, {}); toast.success(action === "approve" ? "Access approved" : "Request rejected"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const create = async () => {
    setBusy(true);
    try { await api.post("/users", f); toast.success(`Account created for ${f.email}`); setF({ email: "", name: "", role: "analyst", password: "" }); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const patch = async (id, body, msg) => {
    try { await api.patch(`/users/${id}`, body); toast.success(msg); load(); } catch (e) { toast.error(apiError(e)); }
  };
  const remove = async (u) => {
    if (!window.confirm(`Delete account ${u.email}?`)) return;
    try { await api.delete(`/users/${u.id}`); toast.success("Account deleted"); load(); } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="users-page">
      <div className="mb-6">
        <p className="label-mono mb-1">Admin · authority accounts</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">User management</h1>
      </div>
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="panel p-5 fade-up" data-testid="user-create-form">
          <div className="mb-4 flex items-center gap-2"><UserPlus size={16} color="#006194" /><h2 className="font-display text-lg font-semibold">Create account</h2></div>
          <div className="space-y-2.5">
            <label className="block"><span className="label-mono mb-1 block">Email</span><input data-testid="user-email-input" className={inputCls} style={bd} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
            <label className="block"><span className="label-mono mb-1 block">Name</span><input data-testid="user-name-input" className={inputCls} style={bd} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label className="block"><span className="label-mono mb-1 block">Role</span>
              <select data-testid="user-role-select" className={inputCls} style={bd} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                <option value="viewer">viewer — read-only</option><option value="analyst">analyst — ingest, correlate, review</option><option value="supervisor">supervisor — + alerts, overrides</option><option value="admin">admin — + manage users</option>
              </select></label>
            <label className="block"><span className="label-mono mb-1 block">Password (min 8)</span><input data-testid="user-password-input" type="password" className={inputCls} style={bd} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
            <button data-testid="btn-create-user" disabled={busy} onClick={create} className="rounded bg-cyan-400 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{busy ? "Creating…" : "Create account"}</button>
          </div>
        </div>
        <div className="panel overflow-hidden fade-up" data-testid="users-list">
          <table className="w-full text-xs">
            <thead><tr className="label-mono text-left">{["Name", "Email", "Role", "Status", "Alert emails", "Last login", "Actions"].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
            <tbody>
              {users === null && <tr><td colSpan={7} className="px-4 py-8 text-center font-mono text-xs text-slate-500" data-testid="users-loading">Loading accounts…</td></tr>}
              {users?.map((u) => (
                <tr key={u.id} data-testid={`user-row-${u.email}`} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                  <td className="px-4 py-2.5">{u.name}{u.id === me?.id && <span className="ml-1 text-slate-500">(you)</span>}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <select data-testid={`user-role-${u.email}`} value={u.role} disabled={u.id === me?.id} onChange={(e) => patch(u.id, { role: e.target.value }, `Role updated to ${e.target.value}`)}
                      className="rounded border bg-transparent px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider outline-none" style={{ color: ROLE_COLOR[u.role], borderColor: `${ROLE_COLOR[u.role]}66` }}>
                      {["viewer", "analyst", "supervisor", "admin"].map((r) => <option key={r} value={r} style={{ color: "#191c1e", background: "#ffffff" }}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: u.active ? "#006a61" : "#707881" }}>{u.active ? "active" : "deactivated"}</td>
                  <td className="px-4 py-2.5">{u.role === "analyst" ? <span className="font-mono text-[10px] text-slate-600">—</span> : <label className="flex items-center gap-1.5 font-mono text-[10px] text-slate-300"><input type="checkbox" data-testid={`user-notify-${u.email}`} checked={u.notify_alerts !== false} onChange={(e) => patch(u.id, { notify_alerts: e.target.checked }, e.target.checked ? "Alert emails enabled" : "Alert emails muted")} /> {u.notify_alerts !== false ? "on" : "muted"}</label>}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">{fmtTime(u.last_login)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <button data-testid={`user-toggle-active-${u.email}`} disabled={u.id === me?.id} title={u.active ? "Deactivate" : "Activate"} onClick={() => patch(u.id, { active: !u.active }, u.active ? "Account deactivated" : "Account activated")} className="rounded p-1 text-slate-400 hover:text-amber-300 disabled:opacity-30">{u.active ? <Ban size={13} /> : <CheckCircle2 size={13} />}</button>
                      <button data-testid={`user-reset-password-${u.email}`} title="Reset password" onClick={() => { const p = window.prompt(`New password for ${u.email} (min 8 chars)`); if (p) patch(u.id, { password: p }, "Password reset"); }} className="rounded p-1 text-slate-400 hover:text-cyan-300"><ShieldCheck size={13} /></button>
                      <button data-testid={`user-delete-${u.email}`} disabled={u.id === me?.id} title="Delete" onClick={() => remove(u)} className="rounded p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4"><EmailSettings onChanged={load} /></div>
      <div className="panel mt-4 overflow-hidden fade-up" data-testid="role-requests">
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
          <h2 className="font-display font-semibold">Elevated access requests</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Viewers requesting Analyst / Supervisor · admin approval</span>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="label-mono text-left">{["Requested at", "User", "Email", "Current", "Requested role", "Organization", "Reason", "Status", "Actions"].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
          <tbody>
            {(reqs || []).map((r) => (
              <tr key={r.id} data-testid={`role-request-row-${r.id}`} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                <td className="px-4 py-2 font-mono text-slate-400">{fmtTime(r.requested_at)}</td>
                <td className="px-4 py-2 text-slate-200">{r.name || "—"}</td>
                <td className="px-4 py-2 font-mono text-slate-300">{r.email}</td>
                <td className="px-4 py-2 font-mono text-[10px] uppercase" style={{ color: ROLE_COLOR[r.current_role] || "#707881" }}>{r.current_role}</td>
                <td className="px-4 py-2 font-mono text-[10px] uppercase" style={{ color: ROLE_COLOR[r.requested_role] }}>{r.requested_role}</td>
                <td className="px-4 py-2 text-slate-400">{r.organization || "—"}</td>
                <td className="px-4 py-2 text-slate-400 max-w-[220px] truncate" title={r.reason || ""}>{r.reason || "—"}</td>
                <td className="px-4 py-2 font-mono text-[10px] uppercase" style={{ color: r.status === "pending" ? "#b26a00" : r.status === "approved" ? "#006a61" : "#707881" }}>{r.status}</td>
                <td className="px-4 py-2">
                  {r.status === "pending" ? (
                    <div className="flex items-center gap-1.5">
                      <button data-testid={`approve-request-${r.id}`} title="Approve" onClick={() => decide(r.id, "approve", r.email)} className="rounded p-1 text-emerald-400 hover:bg-emerald-400/10"><Check size={14} /></button>
                      <button data-testid={`reject-request-${r.id}`} title="Reject" onClick={() => decide(r.id, "reject", r.email)} className="rounded p-1 text-rose-400 hover:bg-rose-400/10"><X size={14} /></button>
                    </div>
                  ) : <span className="text-slate-600">—</span>}
                </td>
              </tr>
            ))}
            {reqs && reqs.length === 0 && <tr><td colSpan={9} className="px-4 py-5 text-center text-slate-500">No access requests.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="panel mt-4 overflow-hidden fade-up" data-testid="reset-requests">
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
          <h2 className="font-display font-semibold">Password reset requests</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: resets?.email_configured ? "#006a61" : "#b26a00" }} data-testid="email-delivery-status">
            {resets?.email_configured ? "email delivery: Resend configured" : "email delivery not configured — hand links to users manually (set RESEND_API_KEY)"}
          </span>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="label-mono text-left">{["Requested", "Email", "Delivery", "Status", "Link"].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
          <tbody>
            {(resets?.requests || []).map((r) => {
              const expired = new Date(r.expires_at) < new Date();
              return (
                <tr key={r.id} data-testid={`reset-request-${r.id}`} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                  <td className="px-4 py-2 font-mono text-slate-400">{fmtTime(r.created_at)}</td>
                  <td className="px-4 py-2 font-mono text-slate-200">{r.email}</td>
                  <td className="px-4 py-2 font-mono text-[10px] uppercase" style={{ color: r.delivery === "email" ? "#006a61" : "#b26a00" }}>{r.delivery}</td>
                  <td className="px-4 py-2 font-mono text-[10px] uppercase text-slate-400">{r.used ? "used" : expired ? "expired" : "pending"}</td>
                  <td className="px-4 py-2">{r.link && !r.used && !expired ? <button data-testid={`copy-reset-link-${r.id}`} onClick={() => { navigator.clipboard?.writeText(r.link); toast.success("Reset link copied"); }} className="font-mono text-[10px] uppercase tracking-wider text-cyan-300 hover:underline">copy link</button> : <span className="text-slate-600">—</span>}</td>
                </tr>
              );
            })}
            {resets && resets.requests.length === 0 && <tr><td colSpan={5} className="px-4 py-5 text-center text-slate-500">No reset requests.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
