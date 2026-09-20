import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpCircle, ShieldCheck, LogIn } from "lucide-react";
import { api, apiError, ROLE_LABEL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ROLE_DESC = {
  guest: "Public read-only access to the demo, reference case, archive, zones and data sources.",
  viewer: "Authenticated read-only access. You can request Analyst or Supervisor access below.",
  analyst: "Ingest, correlate, review and export investigations.",
  supervisor: "Analyst permissions plus alert acknowledgement and case overrides.",
  admin: "Full administration: user & role management, reference-case pinning, system settings.",
};
const STATUS_COLOR = { pending: "#b26a00", approved: "#006a61", rejected: "#ba1a1a", cancelled: "#707881" };

export default function Account() {
  const { user } = useAuth();
  const [req, setReq] = useState(undefined); // undefined=loading, null=none
  const [role, setRole] = useState("analyst");
  const [org, setOrg] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const isGuest = user?.role === "guest";
  const canRequest = user && user.role === "viewer";

  const load = useCallback(() => {
    if (isGuest || !user) { setReq(null); return; }
    api.get("/role-requests/me").then((r) => setReq(r.data.request || null)).catch(() => setReq(null));
  }, [isGuest, user]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setBusy(true);
    try { await api.post("/role-requests", { requested_role: role, organization: org || null, reason: reason || null }); toast.success("Access request submitted for administrator approval"); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const cancel = async () => { try { await api.delete("/role-requests/me"); toast.success("Request cancelled"); load(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="account-page">
      <div className="mb-6">
        <p className="label-mono mb-1">Session · account</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">My account</h1>
      </div>
      <div className="grid gap-4 max-w-3xl">
        <div className="panel p-5 fade-up" data-testid="account-summary">
          {isGuest ? (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Signed in as</p>
              <p className="mt-1 font-display text-xl font-bold" style={{ color: "#707881" }}>Guest · read only</p>
              <p className="mt-2 text-sm text-slate-400">{ROLE_DESC.guest}</p>
              <Link to="/signup" data-testid="account-signup-link" className="mt-4 inline-flex items-center gap-2 rounded bg-cyan-400 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300"><LogIn size={13} /> Create a free Viewer account</Link>
            </div>
          ) : (
            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="label-mono">Name</p><p className="mt-1 text-sm text-slate-200" data-testid="account-name">{user?.name}</p></div>
                <div><p className="label-mono">Email</p><p className="mt-1 font-mono text-sm text-slate-300" data-testid="account-email">{user?.email}</p></div>
                <div><p className="label-mono">Current role</p><p className="mt-1 font-mono text-sm font-semibold uppercase" style={{ color: "#006194" }} data-testid="account-role">{ROLE_LABEL[user?.role] || user?.role}</p></div>
                <div><p className="label-mono">Requested role</p>
                  <p className="mt-1 font-mono text-sm" data-testid="account-requested-role">
                    {req === undefined ? <span className="text-slate-500">checking…</span>
                      : req && req.status === "pending" ? <span style={{ color: STATUS_COLOR.pending }}>{req.requested_role.toUpperCase()} · PENDING ADMIN APPROVAL</span>
                      : req && req.status === "approved" ? <span style={{ color: STATUS_COLOR.approved }}>{req.requested_role.toUpperCase()} · APPROVED</span>
                      : req && req.status === "rejected" ? <span style={{ color: STATUS_COLOR.rejected }}>{req.requested_role.toUpperCase()} · REJECTED</span>
                      : <span className="text-slate-500">No elevated-access request</span>}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">{ROLE_DESC[user?.role]}</p>
            </div>
          )}
        </div>

        {canRequest && (!req || req.status !== "pending") && (
          <div className="panel p-5 fade-up" data-testid="role-request-form">
            <div className="mb-3 flex items-center gap-2"><ArrowUpCircle size={16} color="#006194" /><h2 className="font-display text-lg font-semibold">Request elevated access</h2></div>
            <p className="mb-3 text-xs text-slate-400">Analyst and Supervisor access require administrator approval. Administrator access cannot be requested.</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="block"><span className="label-mono mb-1 block">Requested role</span>
                <select data-testid="role-request-select" value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60" style={{ borderColor: "var(--border-highlight)" }}>
                  <option value="analyst">analyst — ingest, correlate, review</option>
                  <option value="supervisor">supervisor — + alerts, overrides</option>
                </select></label>
              <label className="block"><span className="label-mono mb-1 block">Organization (optional)</span>
                <input data-testid="role-request-org" value={org} onChange={(e) => setOrg(e.target.value)} className="w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60" style={{ borderColor: "var(--border-highlight)" }} /></label>
            </div>
            <label className="mt-2.5 block"><span className="label-mono mb-1 block">Reason (optional)</span>
              <textarea data-testid="role-request-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded border bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400/60" style={{ borderColor: "var(--border-highlight)" }} /></label>
            <button data-testid="role-request-submit" disabled={busy} onClick={submit} className="mt-3 inline-flex items-center gap-2 rounded bg-cyan-400 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50"><ShieldCheck size={13} /> {busy ? "Submitting…" : "Submit request"}</button>
          </div>
        )}

        {canRequest && req && req.status === "pending" && (
          <div className="panel p-5 fade-up" data-testid="role-request-pending">
            <p className="text-sm text-slate-300">Your request for <span className="font-mono uppercase" style={{ color: "#b26a00" }}>{req.requested_role}</span> access is pending administrator approval.</p>
            <button data-testid="role-request-cancel" onClick={cancel} className="mt-3 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 hover:bg-slate-800/60" style={{ borderColor: "var(--border-default)" }}>Cancel request</button>
          </div>
        )}
      </div>
    </div>
  );
}
