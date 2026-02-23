"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { useUser } from "@/hooks/useUser";
import Topbar from "@/components/layout/Topbar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  AI_TASK_ACTIONS,
} from "@/lib/constants";
import type { Task, Category, Profile, TaskStatus } from "@/types";

export default function TasksPage() {
  const supabase = useSupabase();
  const { profile, isAdmin, loading: userLoading } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showDetail, setShowDetail] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [members, setMembers] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: 2,
    due_date: "",
    category_id: "",
  });
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = async () => {
    const { data: taskData } = await supabase
      .from("tasks")
      .select(
        "*, category:categories(id, name, color), assignee:profiles!assigned_to(id, full_name, email)",
      )
      .order("created_at", { ascending: false });
    setTasks(taskData || []);

    const { data: catData } = await supabase.from("categories").select("*");
    setCategories(catData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMembers = async (catId: string) => {
    if (!catId) {
      setMembers([]);
      return;
    }
    const { data } = await supabase
      .from("category_members")
      .select("profile:profiles!user_id(id, full_name, email)")
      .eq("category_id", catId);
    setMembers(data?.map((m: any) => m.profile).filter(Boolean) || []);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.category_id) {
      toast("Select a category", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: newTask.title,
      description: newTask.description || null,
      assigned_to: newTask.assigned_to || null,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      category_id: newTask.category_id,
      created_by: profile?.id,
    });
    if (error) {
      toast(error.message, "error");
    } else {
      toast("Task created", "success");
      setShowCreate(false);
      setNewTask({
        title: "",
        description: "",
        assigned_to: "",
        priority: 2,
        due_date: "",
        category_id: "",
      });
      fetchData();
    }
    setSaving(false);
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId);
    if (error) {
      toast(error.message, "error");
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
      );
      if (showDetail?.id === taskId)
        setShowDetail((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    toast("Task deleted", "success");
    setShowDetail(null);
    fetchData();
  };

  const runAIAction = async (action: string, task: Task) => {
    setAiLoading(true);
    setAiResult("");
    try {
      const res = await fetch("/api/ai/task-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          task: {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
          },
        }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setAiResult((prev) => prev + decoder.decode(value));
        }
      }
    } catch {
      toast("AI action failed", "error");
    }
    setAiLoading(false);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCategory !== "all" && t.category_id !== filterCategory)
      return false;
    return true;
  });

  if (userLoading || loading) {
    return (
      <>
        <Topbar title="Tasks" />
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Tasks" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">All Statuses</option>
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-400">
              {filteredTasks.length} tasks
            </span>
          </div>
          <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-gray-500 dark:text-gray-400">No tasks found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Task
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Assignee
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Priority
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTasks.map((task) => {
                  const prioInfo = TASK_PRIORITIES.find(
                    (p) => p.value === task.priority,
                  );
                  const statusInfo = TASK_STATUSES.find(
                    (s) => s.value === task.status,
                  );
                  return (
                    <tr
                      key={task.id}
                      onClick={() => {
                        setShowDetail(task);
                        setAiResult("");
                      }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                (task.category as any)?.color || "#3B82F6",
                            }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {(task.category as any)?.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {(task.assignee as any)?.full_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={prioInfo?.color}>
                          {prioInfo?.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={task.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateTaskStatus(
                              task.id,
                              e.target.value as TaskStatus,
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {task.due_date
                          ? new Date(task.due_date).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Task Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="New Task"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <Input
              label="Title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Task title"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) =>
                  setNewTask((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Task description"
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>
            <Select
              label="Category"
              value={newTask.category_id}
              onChange={(e) => {
                setNewTask((p) => ({
                  ...p,
                  category_id: e.target.value,
                  assigned_to: "",
                }));
                fetchMembers(e.target.value);
              }}
              options={[
                { value: "", label: "Select Category" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Select
              label="Assign To"
              value={newTask.assigned_to}
              onChange={(e) =>
                setNewTask((p) => ({ ...p, assigned_to: e.target.value }))
              }
              options={[
                { value: "", label: "Unassigned" },
                ...members.map((m) => ({ value: m.id, label: m.full_name })),
              ]}
            />
            <Select
              label="Priority"
              value={newTask.priority}
              onChange={(e) =>
                setNewTask((p) => ({ ...p, priority: +e.target.value }))
              }
              options={TASK_PRIORITIES.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
            />
            <Input
              label="Due Date"
              type="date"
              value={newTask.due_date}
              onChange={(e) =>
                setNewTask((p) => ({ ...p, due_date: e.target.value }))
              }
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
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Task Detail Modal */}
        <Modal
          isOpen={!!showDetail}
          onClose={() => {
            setShowDetail(null);
            setAiResult("");
          }}
          title={showDetail?.title || ""}
          size="lg"
        >
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </label>
                  <Select
                    value={showDetail.status}
                    onChange={(e) =>
                      updateTaskStatus(
                        showDetail.id,
                        e.target.value as TaskStatus,
                      )
                    }
                    options={TASK_STATUSES.map((s) => ({
                      value: s.value,
                      label: s.label,
                    }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Priority
                  </label>
                  <p className="mt-1">
                    <Badge
                      className={
                        TASK_PRIORITIES.find(
                          (p) => p.value === showDetail.priority,
                        )?.color
                      }
                    >
                      {
                        TASK_PRIORITIES.find(
                          (p) => p.value === showDetail.priority,
                        )?.label
                      }
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Category
                  </label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: (showDetail.category as any)?.color,
                      }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {(showDetail.category as any)?.name}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Assignee
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {(showDetail.assignee as any)?.full_name || "Unassigned"}
                  </p>
                </div>
              </div>

              {showDetail.description && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Description
                  </label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                    {showDetail.description}
                  </p>
                </div>
              )}

              {showDetail.due_date && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Due Date
                  </label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {new Date(showDetail.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* AI Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                  AI Actions
                </label>
                <div className="flex flex-wrap gap-2">
                  {AI_TASK_ACTIONS.map((action) => (
                    <button
                      key={action.value}
                      onClick={() => runAIAction(action.value, showDetail)}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                      <span>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>

                {(aiLoading || aiResult) && (
                  <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    {aiLoading && <Spinner size="sm" />}
                    <div className="prose-chat text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {aiResult}
                    </div>
                    {aiResult && !aiLoading && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3"
                        onClick={() => setAiResult("")}
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                {isAdmin && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteTask(showDetail.id)}
                  >
                    Delete Task
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowDetail(null);
                    setAiResult("");
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
