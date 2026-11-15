"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Check, Spinner, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import FileUpload from "@/components/ui/FileUpload";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function LeaderEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    role: "",
    description: "",
    imageUrl: "",
    section: "organization",
    order: "1",
  });

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/leaders/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setForm({
            name: d.name || "",
            role: d.role || "",
            description: d.description || "",
            imageUrl: d.imageUrl || "",
            section: d.section || "organization",
            order: String(d.order ?? 1),
          });
        } else {
          setError("Leader not found");
        }
      })
      .catch(() => setError("Failed to load leader"))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      name: form.name,
      role: form.role,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      section: form.section,
      order: form.order === "" ? 1 : Number(form.order),
    };

    try {
      const url = isNew ? "/api/leaders" : `/api/leaders/${id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save");
      router.push("/admin/leaders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leaders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete");
      router.push("/admin/leaders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slu-gray-100" />
          <div className="rounded-2xl border border-slu-gray-200 bg-white p-6 space-y-4">
            <div className="h-10 rounded-xl bg-slu-gray-100" />
            <div className="h-24 rounded-xl bg-slu-gray-100" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 rounded-xl bg-slu-gray-100" />
              <div className="h-10 rounded-xl bg-slu-gray-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/leaders"
            className="rounded-lg p-2 text-slu-gray-500 transition-colors hover:bg-slu-gray-100 hover:text-slu-black"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slu-black">
            {isNew ? "New Leader" : "Edit Leader"}
          </h1>
        </div>
        {!isNew && (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <Trash size={16} />
            Delete
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slu-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slu-gray-700">
            Name
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-slu-gray-200 px-4 py-2.5 text-sm text-slu-black outline-none transition-colors focus:border-slu-blue focus:ring-2 focus:ring-slu-blue/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slu-gray-700">
            Role
          </label>
          <input
            type="text"
            required
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full rounded-xl border border-slu-gray-200 px-4 py-2.5 text-sm text-slu-black outline-none transition-colors focus:border-slu-blue focus:ring-2 focus:ring-slu-blue/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slu-gray-700">
            Description
          </label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-xl border border-slu-gray-200 px-4 py-2.5 text-sm text-slu-black outline-none transition-colors focus:border-slu-blue focus:ring-2 focus:ring-slu-blue/20"
          />
        </div>

        <FileUpload
          value={form.imageUrl}
          onChange={(url) => setForm({ ...form, imageUrl: url })}
          folder="leaders"
          label="Photo"
          previewClassName="h-32 w-32 rounded-full border border-slu-gray-200 object-cover"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slu-gray-700">
              Section
            </label>
            <select
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              className="w-full rounded-xl border border-slu-gray-200 bg-white px-4 py-2.5 text-sm text-slu-black outline-none transition-colors focus:border-slu-blue focus:ring-2 focus:ring-slu-blue/20"
            >
              <option value="organization">Organization</option>
              <option value="circle">Circle</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slu-gray-700">
              Order
            </label>
            <input
              type="number"
              min={1}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: e.target.value })}
              className="w-full rounded-xl border border-slu-gray-200 px-4 py-2.5 text-sm text-slu-black outline-none transition-colors focus:border-slu-blue focus:ring-2 focus:ring-slu-blue/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slu-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slu-blue-dark disabled:opacity-50"
          >
            {saving ? (
              <Spinner size={18} className="animate-spin" />
            ) : (
              <Check size={18} />
            )}
            {saving ? "Saving..." : "Save Leader"}
          </button>
          <Link
            href="/admin/leaders"
            className="rounded-xl border border-slu-gray-200 px-5 py-2.5 text-sm font-medium text-slu-gray-600 transition-colors hover:bg-slu-gray-100"
          >
            Cancel
          </Link>
        </div>
      </form>

      <ConfirmModal
        open={showDelete}
        title="Delete Leader"
        message="Are you sure you want to delete this leader? This cannot be undone."
        variant="danger"
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
