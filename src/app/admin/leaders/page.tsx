"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash } from "@phosphor-icons/react";
import { usePermissions } from "@/lib/usePermissions";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Leader {
  id: string;
  name: string;
  role: string;
  description: string | null;
  imageUrl: string | null;
  section: string;
  order: number;
}

type SectionFilter = "all" | "organization" | "circle";

const TABS: { value: SectionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "organization", label: "Organization" },
  { value: "circle", label: "Circle" },
];

export default function LeadersPage() {
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SectionFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaders")
      .then((res) => res.json())
      .then((data) => setLeaders(data.data || []))
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/leaders/${deleteTarget}`, { method: "DELETE" });
    setLeaders((prev) => prev.filter((l) => l.id !== deleteTarget));
    setDeleteTarget(null);
  }

  const filtered =
    filter === "all" ? leaders : leaders.filter((l) => l.section === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slu-black">Leaders</h1>
          <p className="text-sm text-slu-gray-500">
            Manage organization and SLUnite circle leaders.
          </p>
        </div>
        {canCreate("groups") && (
          <Link
            href="/admin/leaders/new"
            className="inline-flex items-center gap-2 rounded-xl bg-slu-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slu-blue-dark"
          >
            <Plus size={18} />
            Add Leader
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-slu-blue text-white"
                : "border border-slu-gray-200 bg-white text-slu-gray-600 hover:bg-slu-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slu-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slu-gray-200 bg-slu-gray-100">
                <th className="px-4 py-3 font-semibold text-slu-gray-700">
                  Photo
                </th>
                <th className="px-4 py-3 font-semibold text-slu-gray-700">
                  Name
                </th>
                <th className="px-4 py-3 font-semibold text-slu-gray-700">
                  Role
                </th>
                <th className="px-4 py-3 font-semibold text-slu-gray-700">
                  Section
                </th>
                <th className="px-4 py-3 font-semibold text-slu-gray-700">
                  Order
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slu-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slu-gray-100">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 rounded-full bg-slu-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-32 rounded bg-slu-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 rounded bg-slu-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-6 w-20 rounded-full bg-slu-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-8 rounded bg-slu-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <div className="h-8 w-8 rounded-lg bg-slu-gray-200" />
                          <div className="h-8 w-8 rounded-lg bg-slu-gray-200" />
                        </div>
                      </td>
                    </tr>
                  ))
                : filtered.map((leader) => (
                    <tr
                      key={leader.id}
                      className="transition-colors hover:bg-slu-gray-50"
                    >
                      <td className="px-4 py-3">
                        {leader.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={leader.imageUrl}
                            alt={leader.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slu-blue/10 text-sm font-bold text-slu-blue">
                            {leader.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slu-black">
                        {leader.name}
                      </td>
                      <td className="px-4 py-3 text-slu-gray-600">
                        {leader.role}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            leader.section === "circle"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slu-blue/10 text-slu-blue"
                          }`}
                        >
                          {leader.section === "circle"
                            ? "Circle"
                            : "Organization"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slu-gray-600">
                        {leader.order}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate("groups") && (
                            <Link
                              href={`/admin/leaders/${leader.id}`}
                              className="rounded-lg p-2 text-slu-gray-500 transition-colors hover:bg-slu-blue/10 hover:text-slu-blue"
                            >
                              <Pencil size={16} />
                            </Link>
                          )}
                          {canDelete("groups") && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(leader.id)}
                              className="rounded-lg p-2 text-slu-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-slu-gray-500">
            {canCreate("groups")
              ? "No leaders found. Add your first leader to get started."
              : "No leaders found."}
          </div>
        )}
      </div>
      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Leader"
        message="Are you sure you want to delete this leader? This cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
