"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { useUser } from "@/hooks/useUser";
import Topbar from "@/components/layout/Topbar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";
import { CATEGORY_COLORS } from "@/lib/constants";
import Link from "next/link";
import type { Category, Profile } from "@/types";

export default function CategoriesPage() {
  const supabase = useSupabase();
  const { profile, isAdmin, loading: userLoading } = useUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [newCat, setNewCat] = useState({
    name: "",
    description: "",
    color: CATEGORY_COLORS[0],
  });
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [catMembers, setCatMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (cats) {
      const withCounts = await Promise.all(
        cats.map(async (cat: any) => {
          const { count: memberCount } = await supabase
            .from("category_members")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id);
          const { count: taskCount } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id);
          return {
            ...cat,
            member_count: memberCount || 0,
            task_count: taskCount || 0,
          };
        }),
      );
      setCategories(withCounts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("categories").insert({
      name: newCat.name,
      description: newCat.description || null,
      color: newCat.color,
      created_by: profile?.id,
    });
    if (error) {
      toast(error.message, "error");
    } else {
      toast("Category created", "success");
      setShowCreate(false);
      setNewCat({ name: "", description: "", color: CATEGORY_COLORS[0] });
      fetchCategories();
    }
    setSaving(false);
  };

  const openAssign = async (catId: string) => {
    setShowAssign(catId);
    // Fetch all employees
    const { data: emps } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "employee");
    setEmployees(emps || []);
    // Fetch current members
    const { data: members } = await supabase
      .from("category_members")
      .select("user_id")
      .eq("category_id", catId);
    setCatMembers(members?.map((m: any) => m.user_id) || []);
  };

  const toggleMember = (userId: string) => {
    setCatMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const saveMembers = async () => {
    if (!showAssign) return;
    setSaving(true);
    // Delete existing members
    await supabase
      .from("category_members")
      .delete()
      .eq("category_id", showAssign);
    // Insert new members
    if (catMembers.length > 0) {
      await supabase
        .from("category_members")
        .insert(
          catMembers.map((user_id) => ({ category_id: showAssign, user_id })),
        );
    }
    toast("Members updated", "success");
    setShowAssign(null);
    fetchCategories();
    setSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its tasks?")) return;
    await supabase.from("categories").delete().eq("id", id);
    toast("Category deleted", "success");
    fetchCategories();
  };

  if (userLoading || loading) {
    return (
      <>
        <Topbar title="Categories" />
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Categories" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500 dark:text-gray-400">
            {categories.length} categories
          </p>
          {isAdmin && (
            <Button onClick={() => setShowCreate(true)}>+ New Category</Button>
          )}
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-500 dark:text-gray-400">
              No categories yet
            </p>
            {isAdmin && (
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Create your first category to get started
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-2" style={{ backgroundColor: cat.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <Link href={`/categories/${cat.id}`} className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {cat.name}
                      </h3>
                    </Link>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openAssign(cat.id)}
                          className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Assign members"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      {cat.member_count} members
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      {cat.task_count} tasks
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Category Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="New Category"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Name"
              value={newCat.name}
              onChange={(e) =>
                setNewCat((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="e.g. Frontend Development"
              required
            />
            <Input
              label="Description"
              value={newCat.description}
              onChange={(e) =>
                setNewCat((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Optional description"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCat((p) => ({ ...p, color }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${newCat.color === color ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Assign Members Modal */}
        <Modal
          isOpen={!!showAssign}
          onClose={() => setShowAssign(null)}
          title="Assign Members"
        >
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {employees.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">
                No employees found
              </p>
            ) : (
              employees.map((emp) => (
                <label
                  key={emp.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={catMembers.includes(emp.id)}
                    onChange={() => toggleMember(emp.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-medium">
                    {emp.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {emp.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {emp.email}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <Button variant="secondary" onClick={() => setShowAssign(null)}>
              Cancel
            </Button>
            <Button onClick={saveMembers} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </Modal>
      </div>
    </>
  );
}
