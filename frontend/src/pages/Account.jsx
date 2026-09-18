import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpCircle, ShieldCheck, LogIn, User, Mail, Shield, Building, Clock, Loader2 } from "lucide-react";
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
  pending: "#F59E0B",
  approved: "#10B981",
  rejected: "#EF4444",
  cancelled: "#94A3B8",
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
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#070D18]" data-testid="account-page">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-[#1B2B44] pb-5">
          <p className="label-mono text-cyan-400 mb-1">Session &amp; Credentials</p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            User Account &amp; Access Controls
          </h1>
        </div>

        {/* Profile Card */}
        <div className="panel p-6 border-[#1B2B44] bg-[#0A1424] shadow-xl fade-up" data-testid="account-summary">
          {isGuest ? (
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <User size={13} className="text-cyan-400" /> Active Session Type
              </div>
              <p className="mt-1.5 font-display text-2xl font-bold text-slate-300">
                Guest · Read Only
              </p>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-xl">
                {ROLE_DESC.guest}
              </p>
              <Link
                to="/signup"
                data-testid="account-signup-link"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#00E5FF] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#070D18] shadow-lg shadow-cyan-500/20 hover:bg-[#38BDF8] transition-all"
              >
                <LogIn size={14} /> Create a Free Viewer Account
              </Link>
            </div>
          ) : (
            <div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pb-5 border-b border-[#1B2B44]/70">
                <div className="rounded-lg border border-[#1E314B] bg-[#070D18] p-3.5">
                  <p className="label-mono text-[9.5px] text-slate-400">Full Name</p>
                  <p className="mt-1 text-sm font-semibold text-white truncate" data-testid="account-name">
                    {user?.name}
                  </p>
                </div>

                <div className="rounded-lg border border-[#1E314B] bg-[#070D18] p-3.5">
                  <p className="label-mono text-[9.5px] text-slate-400">Email Address</p>
                  <p className="mt-1 font-mono text-xs text-slate-300 truncate" data-testid="account-email">
                    {user?.email}
                  </p>
                </div>

                <div className="rounded-lg border border-[#1E314B] bg-[#070D18] p-3.5">
                  <p className="label-mono text-[9.5px] text-slate-400">Current Role</p>
                  <p
                    className="mt-1 font-mono text-xs font-bold uppercase text-[#00E5FF]"
                    data-testid="account-role"
                  >
                    {ROLE_LABEL[user?.role] || user?.role}
                  </p>
                </div>

                <div className="rounded-lg border border-[#1E314B] bg-[#070D18] p-3.5">
                  <p className="label-mono text-[9.5px] text-slate-400">Access Request Status</p>
                  <p className="mt-1 font-mono text-[11px] font-medium" data-testid="account-requested-role">
                    {req === undefined ? (
                      <span className="text-slate-500">checking…</span>
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

              <div className="mt-4 flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
                <Shield size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                <span>{ROLE_DESC[user?.role]}</span>
              </div>
            </div>
          )}
        </div>

        {/* Elevated Role Request Form */}
        {canRequest && (!req || req.status !== "pending") && (
          <div className="panel p-6 border-[#1B2B44] bg-[#0A1424] shadow-xl fade-up" data-testid="role-request-form">
            <div className="mb-2 flex items-center gap-2">
              <ArrowUpCircle size={17} className="text-[#00E5FF]" />
              <h2 className="font-display text-lg font-bold text-white">
                Request Elevated Credentials
              </h2>
            </div>
            <p className="mb-5 text-xs text-slate-400">
              Analyst and Supervisor roles provide operational write access and require designated administrator approval. Administrator access cannot be requested.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label-mono mb-1.5 block text-slate-300">Target Role</span>
                <select
                  data-testid="role-request-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-[#1E314B] bg-[#070D18] px-3 py-2 font-mono text-xs text-slate-100 outline-none focus:border-[#00E5FF]"
                >
                  <option value="analyst">Analyst — Ingest, correlate, review &amp; export</option>
                  <option value="supervisor">Supervisor — + Acknowledge alerts, override cases</option>
                </select>
              </label>

              <label className="block">
                <span className="label-mono mb-1.5 block text-slate-300">Agency / Department (Optional)</span>
                <input
                  data-testid="role-request-org"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="e.g. Maritime Coast Guard HQ"
                  className="w-full rounded-lg border border-[#1E314B] bg-[#070D18] px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#00E5FF]"
                />
              </label>
            </div>

            <label className="mt-3.5 block">
              <span className="label-mono mb-1.5 block text-slate-300">Justification / Operational Purpose</span>
              <textarea
                data-testid="role-request-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Explain the investigative or regulatory purpose for requesting elevated credentials..."
                className="w-full rounded-lg border border-[#1E314B] bg-[#070D18] px-3 py-2 text-xs text-slate-100 outline-none focus:border-[#00E5FF]"
              />
            </label>

            <button
              data-testid="role-request-submit"
              disabled={busy}
              onClick={submit}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#00E5FF] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#070D18] shadow-lg shadow-cyan-500/20 hover:bg-[#38BDF8] disabled:opacity-50 transition-all"
            >
              {busy ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Submitting Request…
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
            className="panel p-6 border-amber-500/35 bg-amber-500/5 shadow-xl fade-up"
            data-testid="role-request-pending"
          >
            <div className="flex items-center gap-2.5">
              <Clock size={16} className="text-amber-400" />
              <p className="text-sm font-medium text-slate-200">
                Your request for elevated{" "}
                <span className="font-mono font-bold uppercase text-amber-400">
                  {req.requested_role}
                </span>{" "}
                access is currently pending administrator verification.
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-400 ml-6">
              You will receive an updated role notification once an administrator reviews your submission.
            </p>
            <button
              data-testid="role-request-cancel"
              onClick={cancel}
              className="mt-4 ml-6 rounded-md border border-[#1E314B] bg-[#0A1221] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 hover:bg-[#121E33] hover:text-white transition-colors"
            >
              Cancel Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
