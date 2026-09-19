import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, ShieldCheck, Ban, CheckCircle2, Check, X, Shield, Key } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EmailSettings } from "@/components/admin/EmailSettings";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15";

const ROLE_COLOR = {
  viewer: "#1F7F93",
  analyst: "#1F7F93",
  supervisor: "#B8862A",
  admin: "#C25A49",
};

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [resets, setResets] = useState(null);
  const [reqs, setReqs] = useState(null);
  const [f, setF] = useState({ email: "", name: "", role: "viewer", password: "" });
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([api.get("/users"), api.get("/auth/reset-requests"), api.get("/role-requests")])
      .then(([u, r, rq]) => {
        setUsers(u.data);
        setResets(r.data);
        setReqs(rq.data);
      })
      .catch((e) => {
        setUsers([]);
        toast.error(apiError(e));
      });

  useEffect(() => {
    load();
  }, []);

  const decide = async (id, action, email) => {
    if (action === "approve" && !window.confirm(`Approve elevated access for ${email}?`)) return;
    try {
      await api.post(`/role-requests/${id}/${action}`, {});
      toast.success(action === "approve" ? "Access approved" : "Request rejected");
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      await api.post("/users", f);
      toast.success(`Account created for ${f.email}`);
      setF({ email: "", name: "", role: "analyst", password: "" });
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id, body, msg) => {
    try {
      await api.patch(`/users/${id}`, body);
      toast.success(msg);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete account ${u.email}?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      toast.success("Account deleted");
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F7F6F2] text-slate-900" data-testid="users-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5">
          <p className="label-mono text-sky-700 mb-1">Administrative Governance</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            User Accounts &amp; Role-Based Access
          </h1>
        </div>

        {/* User Create Form & User List */}
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          {/* Create User Panel */}
          <div className="panel p-6 border-slate-200 bg-white shadow-xs" data-testid="user-create-form">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-sky-600" />
              <h2 className="font-display text-base font-bold text-slate-900">Provision Account</h2>
            </div>
            <div className="space-y-3.5">
              <label className="block">
                <span className="label-mono mb-1.5 block text-slate-700">Email Address</span>
                <input
                  data-testid="user-email-input"
                  className={inputCls}
                  placeholder="analyst@agency.gov"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="label-mono mb-1.5 block text-slate-700">Full Name</span>
                <input
                  data-testid="user-name-input"
                  className={inputCls}
                  placeholder="Officer J. Smith"
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                />
              </label>

              <label className="block">
                <span className="label-mono mb-1.5 block text-slate-700">Initial Role</span>
                <select
                  data-testid="user-role-select"
                  className={inputCls}
                  value={f.role}
                  onChange={(e) => setF({ ...f, role: e.target.value })}
                >
                  <option value="viewer">Viewer — Read-only surveillance</option>
                  <option value="analyst">Analyst — Ingest, correlate, review</option>
                  <option value="supervisor">Supervisor — + Alerts, case overrides</option>
                  <option value="admin">Admin — Full security &amp; user management</option>
                </select>
              </label>

              <label className="block">
                <span className="label-mono mb-1.5 block text-slate-700">Initial Password (min 8)</span>
                <input
                  data-testid="user-password-input"
                  type="password"
                  className={inputCls}
                  placeholder="••••••••"
                  value={f.password}
                  onChange={(e) => setF({ ...f, password: e.target.value })}
                />
              </label>

              <button
                data-testid="btn-create-user"
                disabled={busy}
                onClick={create}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-tide disabled:opacity-50 transition-all"
              >
                {busy ? "Creating Account…" : "Provision User"}
              </button>
            </div>
          </div>

          {/* User Accounts Table */}
          <div className="panel overflow-hidden border-slate-200 bg-white shadow-xs" data-testid="users-list">
            <div className="border-b border-slate-200 px-5 py-3.5 bg-slate-50/70">
              <h2 className="font-display text-sm font-bold text-slate-900">Active Agency Users</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="label-mono text-left border-b border-slate-200 bg-slate-50/70 text-slate-600">
                    {["Name", "Email", "Role", "Status", "Alert Emails", "Last Login", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users === null && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center font-mono text-xs text-slate-500" data-testid="users-loading">
                        Loading accounts…
                      </td>
                    </tr>
                  )}
                  {users?.map((u) => (
                    <tr
                      key={u.id}
                      data-testid={`user-row-${u.email}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {u.name}
                        {u.id === me?.id && <span className="ml-1 text-sky-700 font-mono text-[10px]">(you)</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          data-testid={`user-role-${u.email}`}
                          value={u.role}
                          disabled={u.id === me?.id}
                          onChange={(e) =>
                            patch(u.id, { role: e.target.value }, `Role updated to ${e.target.value}`)
                          }
                          className="rounded-md border bg-white px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider outline-none"
                          style={{
                            color: ROLE_COLOR[u.role],
                            borderColor: `${ROLE_COLOR[u.role]}55`,
                          }}
                        >
                          {["viewer", "analyst", "supervisor", "admin"].map((r) => (
                            <option key={r} value={r} style={{ color: "#0F172A", background: "#FFFFFF" }}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider font-semibold"
                          style={{ color: u.active ? "#2E8B6A" : "#5F7684" }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: u.active ? "#2E8B6A" : "#5F7684" }}
                          />
                          {u.active ? "active" : "deactivated"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === "analyst" ? (
                          <span className="font-mono text-[10px] text-slate-400">—</span>
                        ) : (
                          <label className="flex items-center gap-1.5 font-mono text-[10px] text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              data-testid={`user-notify-${u.email}`}
                              checked={u.notify_alerts !== false}
                              onChange={(e) =>
                                patch(
                                  u.id,
                                  { notify_alerts: e.target.checked },
                                  e.target.checked ? "Alert emails enabled" : "Alert emails muted"
                                )
                              }
                              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />{" "}
                            {u.notify_alerts !== false ? "on" : "muted"}
                          </label>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {fmtTime(u.last_login)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            data-testid={`user-toggle-active-${u.email}`}
                            disabled={u.id === me?.id}
                            title={u.active ? "Deactivate Account" : "Activate Account"}
                            onClick={() =>
                              patch(
                                u.id,
                                { active: !u.active },
                                u.active ? "Account deactivated" : "Account activated"
                              )
                            }
                            className="rounded p-1 text-slate-500 hover:text-amber-600 disabled:opacity-30 hover:bg-slate-100 transition-colors"
                          >
                            {u.active ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                          </button>
                          <button
                            data-testid={`user-reset-password-${u.email}`}
                            title="Reset password"
                            onClick={() => {
                              const p = window.prompt(`New password for ${u.email} (min 8 chars)`);
                              if (p) patch(u.id, { password: p }, "Password reset");
                            }}
                            className="rounded p-1 text-slate-500 hover:text-sky-600 hover:bg-slate-100 transition-colors"
                          >
                            <ShieldCheck size={14} />
                          </button>
                          <button
                            data-testid={`user-delete-${u.email}`}
                            disabled={u.id === me?.id}
                            title="Delete Account"
                            onClick={() => remove(u)}
                            className="rounded p-1 text-slate-500 hover:text-rose-600 disabled:opacity-30 hover:bg-slate-100 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div>
          <EmailSettings onChanged={load} />
        </div>

        {/* Role Requests Table */}
        <div className="panel overflow-hidden border-slate-200 bg-white shadow-xs" data-testid="role-requests">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50/70">
            <h2 className="font-display text-sm font-bold text-slate-900">Elevated Access Requests</h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Viewers requesting Analyst / Supervisor privileges
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="label-mono text-left border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  {[
                    "Requested at",
                    "User",
                    "Email",
                    "Current",
                    "Requested role",
                    "Organization",
                    "Reason",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(reqs || []).map((r) => (
                  <tr
                    key={r.id}
                    data-testid={`role-request-row-${r.id}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-slate-500">{fmtTime(r.requested_at)}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{r.name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{r.email}</td>
                    <td
                      className="px-4 py-3 font-mono text-[10px] uppercase font-semibold"
                      style={{ color: ROLE_COLOR[r.current_role] || "#5F7684" }}
                    >
                      {r.current_role}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-[10px] uppercase font-bold"
                      style={{ color: ROLE_COLOR[r.requested_role] }}
                    >
                      {r.requested_role}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.organization || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate" title={r.reason || ""}>
                      {r.reason || "—"}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-[10px] uppercase font-bold"
                      style={{
                        color:
                          r.status === "pending"
                            ? "#B8862A"
                            : r.status === "approved"
                            ? "#2E8B6A"
                            : "#5F7684",
                      }}
                    >
                      {r.status}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            data-testid={`approve-request-${r.id}`}
                            title="Approve"
                            onClick={() => decide(r.id, "approve", r.email)}
                            className="rounded p-1 text-emerald-700 hover:bg-emerald-50"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            data-testid={`reject-request-${r.id}`}
                            title="Reject"
                            onClick={() => decide(r.id, "reject", r.email)}
                            className="rounded p-1 text-rose-700 hover:bg-rose-50"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {reqs && reqs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-500 font-mono text-xs">
                      No access requests pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reset Requests Table */}
        <div className="panel overflow-hidden border-slate-200 bg-white shadow-xs" data-testid="reset-requests">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50/70">
            <h2 className="font-display text-sm font-bold text-slate-900">Password Reset Ledgers</h2>
            <span
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: resets?.email_configured ? "#2E8B6A" : "#B8862A" }}
              data-testid="email-delivery-status"
            >
              {resets?.email_configured
                ? "Email delivery: Resend Active"
                : "Email delivery not configured — hand links to users manually"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="label-mono text-left border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  {["Requested at", "Email", "Delivery", "Status", "Link"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(resets?.requests || []).map((r) => {
                  const expired = new Date(r.expires_at) < new Date();
                  return (
                    <tr
                      key={r.id}
                      data-testid={`reset-request-${r.id}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-slate-500">{fmtTime(r.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-slate-900 font-medium">{r.email}</td>
                      <td
                        className="px-4 py-3 font-mono text-[10px] uppercase font-semibold"
                        style={{ color: r.delivery === "email" ? "#2E8B6A" : "#B8862A" }}
                      >
                        {r.delivery}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] uppercase text-slate-500">
                        {r.used ? "used" : expired ? "expired" : "pending"}
                      </td>
                      <td className="px-4 py-3">
                        {r.link && !r.used && !expired ? (
                          <button
                            data-testid={`copy-reset-link-${r.id}`}
                            onClick={() => {
                              navigator.clipboard?.writeText(r.link);
                              toast.success("Reset link copied to clipboard");
                            }}
                            className="font-mono text-[10.5px] uppercase tracking-wider text-sky-700 hover:underline font-semibold"
                          >
                            Copy Link
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {resets && resets.requests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-mono text-xs">
                      No reset requests active.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
