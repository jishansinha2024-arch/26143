import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpCircle, ShieldCheck, LogIn, User, Shield, Clock, Loader2 } from "lucide-react";
import { api, apiError, ROLE_LABEL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ROLE_DESC = {
  guest: "Public read-only access to demo cases, scene archives, jurisdiction zones, and sensor health telemetry.",
  viewer: "Authenticated read-only access. You can explore active cases and request elevated Analyst or Supervisor roles.",
  analyst: "Operational permissions to ingest Sentinel radar scenes, upload AIS data, correlate vessels, review candidates, and export dossiers.",
  supervisor: "Analyst permissions plus authority to acknowledge tactical alerts, override cases, and review audit ledgers.",
  admin: "Full system administration: user access controls, role request approvals, security rules, and reference case pinning.",
};

const STATUS_COLOR = {
  pending: "#D97706",
  approved: "#059669",
  rejected: "#DC2626",
  cancelled: "#64748B",
};

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
    if (isGuest || !user) {
      setReq(null);
      return;
    }
    api
      .get("/role-requests/me")
      .then((r) => setReq(r.data.request || null))
      .catch(() => setReq(null));
  }, [isGuest, user]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/role-requests", {
        requested_role: role,
        organization: org || null,
        reason: reason || null,
      });
      toast.success("Access request submitted for administrator approval");
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    try {
      await api.delete("/role-requests/me");
      toast.success("Request cancelled");
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] text-slate-900" data-testid="account-page">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 pb-5">
          <p className="label-mono text-sky-700 mb-1">Session &amp; Credentials</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            User Account &amp; Access Controls
          </h1>
        </div>

        {/* Profile Card */}
        <div className="panel p-6 border-slate-200 bg-white shadow-xs" data-testid="account-summary">
          {isGuest ? (
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                <User size={13} className="text-sky-600" /> Active Session Type
              </div>
              <p className="mt-1.5 font-display text-2xl font-bold text-slate-900">
                Guest · Read Only
              </p>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-xl">
                {ROLE_DESC.guest}
              </p>
              <Link
                to="/signup"
                data-testid="account-signup-link"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0B1528] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[#162B4D] transition-all"
              >
                <LogIn size={14} /> Create a Free Viewer Account
              </Link>
            </div>
          ) : (
            <div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pb-5 border-b border-slate-200">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <p className="label-mono text-[9.5px] text-slate-500">Full Name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 truncate" data-testid="account-name">
                    {user?.name}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <p className="label-mono text-[9.5px] text-slate-500">Email Address</p>
                  <p className="mt-1 font-mono text-xs text-slate-700 truncate" data-testid="account-email">
                    {user?.email}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <p className="label-mono text-[9.5px] text-slate-500">Current Role</p>
                  <p
                    className="mt-1 font-mono text-xs font-bold uppercase text-sky-700"
                    data-testid="account-role"
                  >
                    {ROLE_LABEL[user?.role] || user?.role}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <p className="label-mono text-[9.5px] text-slate-500">Access Request Status</p>
                  <p className="mt-1 font-mono text-[11px] font-medium" data-testid="account-requested-role">
                    {req === undefined ? (
                      <span className="text-slate-400">checking…</span>
                    ) : req && req.status === "pending" ? (
                      <span style={{ color: STATUS_COLOR.pending }} className="font-bold">
                        {req.requested_role.toUpperCase()} (PENDING)
                      </span>
                    ) : req && req.status === "approved" ? (
                      <span style={{ color: STATUS_COLOR.approved }} className="font-bold">
                        {req.requested_role.toUpperCase()} (APPROVED)
                      </span>
                    ) : req && req.status === "rejected" ? (
                      <span style={{ color: STATUS_COLOR.rejected }} className="font-bold">
                        {req.requested_role.toUpperCase()} (REJECTED)
                      </span>
                    ) : (
                      <span className="text-slate-500">None active</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                <Shield size={15} className="text-sky-600 shrink-0 mt-0.5" />
                <span>{ROLE_DESC[user?.role]}</span>
              </div>
            </div>
          )}
        </div>

        {/* Elevated Role Request Form */}
        {canRequest && (!req || req.status !== "pending") && (
          <div className="panel p-6 border-slate-200 bg-white shadow-xs" data-testid="role-request-form">
            <div className="mb-2 flex items-center gap-2">
              <ArrowUpCircle size={18} className="text-sky-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Request Elevated Credentials
              </h2>
            </div>
            <p className="mb-5 text-xs text-slate-500">
              Analyst and Supervisor roles provide operational write access and require designated administrator approval. Administrator access cannot be requested.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label-mono mb-1.5 block text-slate-700">Target Role</span>
                <select
                  data-testid="role-request-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
                >
                  <option value="analyst">Analyst — Ingest, correlate, review &amp; export</option>
                  <option value="supervisor">Supervisor — + Acknowledge alerts, override cases</option>
                </select>
              </label>

              <label className="block">
                <span className="label-mono mb-1.5 block text-slate-700">Agency / Department (Optional)</span>
                <input
                  data-testid="role-request-org"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="e.g. Maritime Coast Guard HQ"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
                />
              </label>
            </div>

            <label className="mt-3.5 block">
              <span className="label-mono mb-1.5 block text-slate-700">Justification / Operational Purpose</span>
              <textarea
                data-testid="role-request-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Explain the investigative or regulatory purpose for requesting elevated credentials..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
              />
            </label>

            <button
              data-testid="role-request-submit"
              disabled={busy}
              onClick={submit}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B1528] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[#162B4D] disabled:opacity-50 transition-all"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin text-sky-400" /> Submitting Request…
                </>
              ) : (
                <>
                  <ShieldCheck size={14} /> Submit Access Request
                </>
              )}
            </button>
          </div>
        )}

        {/* Pending Request Status */}
        {canRequest && req && req.status === "pending" && (
          <div
            className="rounded-2xl border border-amber-300 bg-amber-50/80 p-6 shadow-xs"
            data-testid="role-request-pending"
          >
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-amber-600 shrink-0" />
              <p className="text-sm font-semibold text-slate-900">
                Your request for elevated{" "}
                <span className="font-mono font-bold uppercase text-amber-700">
                  {req.requested_role}
                </span>{" "}
                access is currently pending administrator verification.
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-600 ml-7">
              You will receive an updated role notification once an administrator reviews your submission.
            </p>
            <button
              data-testid="role-request-cancel"
              onClick={cancel}
              className="mt-4 ml-7 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              Cancel Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
