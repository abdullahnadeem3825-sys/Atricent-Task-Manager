"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { useUser } from "@/hooks/useUser";
import Topbar from "@/components/layout/Topbar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import type { Profile, Category } from "@/types";

export default function EmployeesPage() {
  const supabase = useSupabase();
  const { isAdmin, loading: userLoading } = useUser();
  const [employees, setEmployees] = useState<
    (Profile & { categories: Category[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [empCategories, setEmpCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [newEmp, setNewEmp] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const fetchEmployees = async () => {
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (allProfiles) {
      const withCategories = await Promise.all(
        allProfiles.map(async (profile: any) => {
          const { data: memberships } = await supabase
            .from("category_members")
            .select("category:categories(*)")
            .eq("user_id", profile.id);
          return {
            ...profile,
            categories:
              memberships?.map((m: any) => m.category).filter(Boolean) || [],
          };
        }),
      );
      setEmployees(withCategories);
    }

    const { data: cats } = await supabase.from("categories").select("*");
    setAllCategories(cats || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmp),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast("Employee created", "success");
      setShowCreate(false);
      setNewEmp({ full_name: "", email: "", password: "" });
      fetchEmployees();
    } catch (err: any) {
      toast(err.message || "Failed to create employee", "error");
    }
    setSaving(false);
  };

  const openAssign = async (userId: string) => {
    setShowAssign(userId);
    const { data } = await supabase
      .from("category_members")
      .select("category_id")
      .eq("user_id", userId);
    setEmpCategories(data?.map((m: any) => m.category_id) || []);
  };

  const toggleCategory = (catId: string) => {
    setEmpCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId],
    );
  };

  const saveCategories = async () => {
    if (!showAssign) return;
    setSaving(true);
    await supabase.from("category_members").delete().eq("user_id", showAssign);
    if (empCategories.length > 0) {
      await supabase.from("category_members").insert(
        empCategories.map((category_id) => ({
          category_id,
          user_id: showAssign,
        })),
      );
    }
    toast("Categories updated", "success");
    setShowAssign(null);
    fetchEmployees();
    setSaving(false);
  };

  if (userLoading || loading) {
    return (
      <>
        <Topbar title="Employees" />
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Topbar title="Employees" />
        <div className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Admin access required.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Employees" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500 dark:text-gray-400">
            {employees.length} team members
          </p>
          <Button onClick={() => setShowCreate(true)}>+ Add Employee</Button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Member
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Categories
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Joined
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
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
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={emp.role === "admin" ? "info" : "default"}>
                      {emp.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {emp.categories.length === 0 ? (
                        <span className="text-xs text-gray-400">None</span>
                      ) : (
                        emp.categories.map((cat) => (
                          <span
                            key={cat.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(emp.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {emp.role !== "admin" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAssign(emp.id)}
                      >
                        Assign Categories
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Employee Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="Add Employee"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Full Name"
              value={newEmp.full_name}
              onChange={(e) =>
                setNewEmp((p) => ({ ...p, full_name: e.target.value }))
              }
              placeholder="John Doe"
              required
            />
            <Input
              label="Email"
              type="email"
              value={newEmp.email}
              onChange={(e) =>
                setNewEmp((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="john@company.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={newEmp.password}
              onChange={(e) =>
                setNewEmp((p) => ({ ...p, password: e.target.value }))
              }
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Employee"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Assign Categories Modal */}
        <Modal
          isOpen={!!showAssign}
          onClose={() => setShowAssign(null)}
          title="Assign Categories"
        >
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {allCategories.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">
                No categories yet
              </p>
            ) : (
              allCategories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={empCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {cat.name}
                    </p>
                    {cat.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <Button variant="secondary" onClick={() => setShowAssign(null)}>
              Cancel
            </Button>
            <Button onClick={saveCategories} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </Modal>
      </div>
    </>
  );
}
