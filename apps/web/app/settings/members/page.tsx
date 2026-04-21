"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Users,
  Zap,
  X,
  Loader2,
  Mail,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { getStoredToken, getCurrentUserId } from "@/lib/auth-client";
import {
  fetchMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  MEMBER_LIMITS,
  ROLE_LABELS,
  ASSIGNABLE_ROLES,
  type Member,
} from "@/lib/organizations-client";
import { fetchSubscription } from "@/lib/billing-client";
import { useToast } from "@/lib/toast-context";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED]/30 to-[#7C3AED]/10 ring-1 ring-[#7C3AED]/20"
    >
      <span className="font-headline text-sm font-semibold text-[#A78BFA]">
        {initials}
      </span>
    </div>
  );
}

// ─── Role badge (read-only) ───────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isAdmin
          ? "bg-[#4EDEA3]/15 text-[#4EDEA3]"
          : "bg-gray-700/50 text-gray-400"
      }`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ─── Role selector (editable) ─────────────────────────────────────────────────

function RoleSelector({
  member,
  onRoleChange,
  isChanging,
}: {
  member: Member;
  onRoleChange: (memberId: string, newRole: string) => void;
  isChanging: boolean;
}) {
  return (
    <div className="relative flex-shrink-0">
      {isChanging ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-700/50 px-2.5 py-0.5 text-xs text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          {ROLE_LABELS[member.role] ?? member.role}
        </span>
      ) : (
        <select
          value={member.role}
          onChange={(e) => onRoleChange(member.id, e.target.value)}
          disabled={isChanging}
          aria-label={`Alterar role de ${member.name}`}
          className="cursor-pointer appearance-none rounded-full border border-transparent bg-gray-700/50 py-0.5 pl-2.5 pr-6 text-xs font-medium text-gray-300 transition-colors hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/10 hover:text-[#A78BFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isCurrentUser,
  onRemove,
  onRoleChange,
  isChangingRole,
}: {
  member: Member;
  isCurrentUser: boolean;
  onRemove: (member: Member) => void;
  onRoleChange: (memberId: string, newRole: string) => void;
  isChangingRole: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-700/30 bg-gray-900/50 px-5 py-4">
      <MemberAvatar name={member.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {member.name}
          {isCurrentUser && (
            <span className="ml-2 text-xs font-normal text-gray-500">(você)</span>
          )}
        </p>
        <p className="truncate text-xs text-gray-400">{member.email}</p>
      </div>

      {isCurrentUser ? (
        <RoleBadge role={member.role} />
      ) : (
        <RoleSelector
          member={member}
          onRoleChange={onRoleChange}
          isChanging={isChangingRole}
        />
      )}

      {!isCurrentUser && (
        <button
          onClick={() => onRemove(member)}
          className="ml-1 flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          aria-label={`Remover ${member.name} da organização`}
          title="Remover membro"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ─── Confirm Remove Modal ─────────────────────────────────────────────────────

function ConfirmRemoveModal({
  member,
  onClose,
  onConfirm,
  isPending,
  error,
}: {
  member: Member;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-remove-title"
      aria-describedby="confirm-remove-desc"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isPending ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-700/30 bg-[#1a1a1a] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2
              id="confirm-remove-title"
              className="font-headline text-base font-bold text-white"
            >
              Remover membro
            </h2>
            <p id="confirm-remove-desc" className="mt-1 text-sm text-gray-400">
              Tem certeza que deseja remover{" "}
              <span className="font-semibold text-gray-200">{member.name}</span>{" "}
              da organização? Esta ação não pode ser desfeita.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-shrink-0 cursor-pointer text-gray-500 transition-colors hover:text-gray-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inline error */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3"
          >
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="btn-secondary flex-1 py-2.5 text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Removendo…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remover
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => inviteMember(email.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-members"] });
      onSuccess(email.trim());
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setInlineError(
        err.response?.data?.message ?? "Erro ao enviar convite. Tente novamente.",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInlineError(null);
    mutate();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-gray-700/30 bg-[#1a1a1a] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="invite-modal-title"
              className="font-headline text-lg font-bold text-white"
            >
              Convidar membro
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Um email de convite será enviado para o endereço informado.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 cursor-pointer text-gray-500 transition-colors hover:text-gray-300"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="invite-email"
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            Email{" "}
            <span className="text-red-400" aria-label="obrigatório">
              *
            </span>
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              aria-hidden="true"
            />
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="membro@empresa.com"
              autoComplete="email"
              required
              className="input-field pl-9"
              disabled={isPending}
              aria-describedby={inlineError ? "invite-email-error" : undefined}
              aria-invalid={!!inlineError}
            />
          </div>

          {inlineError && (
            <p
              id="invite-email-error"
              className="mt-2 text-sm text-red-400"
              role="alert"
            >
              {inlineError}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="btn-secondary flex-1 py-2.5 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#7C3AED] py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Enviando…
                </>
              ) : (
                "Enviar convite"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const router = useRouter();
  const isAuthenticated = !!getStoredToken();
  const currentUserId = getCurrentUserId();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [changingRoleMemberId, setChangingRoleMemberId] = useState<string | null>(null);

  const {
    data: membersData,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useQuery({
    queryKey: ["org-members"],
    queryFn: fetchMembers,
    enabled: isAuthenticated,
  });

  const { data: subscription } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: fetchSubscription,
    enabled: isAuthenticated,
    retry: false,
  });

  const { mutate: doUpdateRole } = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateMemberRole(memberId, role),
    onMutate: ({ memberId }) => setChangingRoleMemberId(memberId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["org-members"] });
      addToast({
        type: "success",
        title: "Role atualizado",
        message: `Role alterado para ${ROLE_LABELS[data.role] ?? data.role}.`,
      });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      addToast({
        type: "error",
        title: "Erro ao atualizar role",
        message:
          err.response?.data?.message ?? "Tente novamente.",
      });
    },
    onSettled: () => setChangingRoleMemberId(null),
  });

  const { mutate: doRemove, isPending: isRemoving } = useMutation({
    mutationFn: () => removeMember(memberToRemove!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-members"] });
      addToast({
        type: "success",
        title: "Membro removido",
        message: `${memberToRemove!.name} foi removido da organização.`,
      });
      setMemberToRemove(null);
      setRemoveError(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setRemoveError(
        err.response?.data?.message ?? "Erro ao remover membro. Tente novamente.",
      );
    },
  });

  const planSlug = subscription?.plan.slug ?? "free";
  const memberLimit = MEMBER_LIMITS[planSlug] ?? null;
  const memberCount = membersData?.count ?? 0;
  const isAtLimit = memberLimit !== null && memberCount >= memberLimit;
  const isUnlimited = memberLimit === null;

  const handleInviteSuccess = (email: string) => {
    addToast({
      type: "success",
      title: "Convite enviado",
      message: `Um email foi enviado para ${email}.`,
    });
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-[#0E0E0E]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </button>
            <div className="h-4 w-px bg-gray-700" aria-hidden="true" />
            <h1 className="font-headline text-base font-semibold text-white">
              Membros
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Title row */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-bold text-white">
              Equipe
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Gerencie os membros da sua organização.
            </p>
          </div>
          <button
            onClick={() => setInviteModalOpen(true)}
            disabled={isAtLimit}
            title={
              isAtLimit
                ? "Limite de membros atingido — faça upgrade para convidar mais"
                : undefined
            }
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Convidar membro
          </button>
        </div>

        {/* Member count / limit bar */}
        {subscription && (
          <div
            className={`mb-6 flex items-center justify-between rounded-xl border px-5 py-4 ${
              isAtLimit
                ? "border-amber-500/20 bg-amber-500/5"
                : "border-gray-700/30 bg-gray-900/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <Users
                className={`h-5 w-5 ${isAtLimit ? "text-amber-400" : "text-gray-400"}`}
                aria-hidden="true"
              />
              <span
                className={`text-sm font-medium ${isAtLimit ? "text-amber-300" : "text-gray-300"}`}
              >
                {isUnlimited
                  ? `${memberCount} ${memberCount === 1 ? "membro" : "membros"} (ilimitado)`
                  : `${memberCount} de ${memberLimit} ${memberLimit === 1 ? "membro" : "membros"}`}
              </span>
            </div>
            {isAtLimit && (
              <button
                onClick={() => router.push("/plans")}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-amber-400"
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                Fazer upgrade
              </button>
            )}
          </div>
        )}

        {/* Members list */}
        {isLoadingMembers ? (
          <div
            className="space-y-3"
            aria-label="Carregando membros"
            aria-busy="true"
          >
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-4 rounded-xl border border-gray-700/30 bg-gray-900/50 p-4"
              >
                <div className="h-10 w-10 rounded-full bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-gray-800" />
                  <div className="h-3 w-1/2 rounded bg-gray-800" />
                </div>
                <div className="h-5 w-16 rounded-full bg-gray-800" />
              </div>
            ))}
          </div>
        ) : membersError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">
              Erro ao carregar membros. Por favor, tente novamente.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {membersData?.members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isCurrentUser={member.id === currentUserId}
                onRemove={(m) => {
                  setRemoveError(null);
                  setMemberToRemove(m);
                }}
                onRoleChange={(memberId, role) =>
                  doUpdateRole({ memberId, role })
                }
                isChangingRole={changingRoleMemberId === member.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <InviteModal
          onClose={() => setInviteModalOpen(false)}
          onSuccess={handleInviteSuccess}
        />
      )}

      {/* Confirm Remove Modal */}
      {memberToRemove && (
        <ConfirmRemoveModal
          member={memberToRemove}
          onClose={() => {
            if (!isRemoving) {
              setMemberToRemove(null);
              setRemoveError(null);
            }
          }}
          onConfirm={() => doRemove()}
          isPending={isRemoving}
          error={removeError}
        />
      )}
    </div>
  );
}
