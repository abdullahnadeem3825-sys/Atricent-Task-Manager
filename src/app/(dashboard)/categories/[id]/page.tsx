"use client";

import { useState, useEffect, use } from "react";
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
import Link from "next/link";

export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = useSupabase();
  const { profile, isAdmin } = useUser();
  const [category, setCategory] = useState<Category | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: 2,
    due_date: "",
  });
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = async () => {
    const { data: cat } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();
    setCategory(cat);

    const { data: taskData } = await supabase
      .from("tasks")
      .select("*, assignee:profiles!assigned_to(id, full_name, email)")
      .eq("category_id", id)
      .order("created_at", { ascending: false });
    setTasks(taskData || []);

    const { data: memberData } = await supabase
      .from("category_members")
      .select("user_id, profile:profiles!user_id(id, full_name, email)")
      .eq("category_id", id);

    const memberProfiles =
      memberData?.map((m: any) => m.profile).filter(Boolean) || [];
    setMembers(memberProfiles);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: newTask.title,
      description: newTask.description || null,
      assigned_to: newTask.assigned_to || null,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      category_id: id,
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

  const applyAIDescription = async () => {
    if (!showDetail) return;
    await supabase
      .from("tasks")
      .update({ description: aiResult })
      .eq("id", showDetail.id);
    toast("Description updated", "success");
    setAiResult("");
    fetchData();
  };

  if (loading) {
    return (
      <>
        <Topbar title="Category" />
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  if (!category) {
    return (
      <>
        <Topbar title="Category Not Found" />
        <div className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            This category doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link
            href="/categories"
            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
          >
            Back to Categories
          </Link>
        </div>
      </>
    );
  }

  const columns: { status: TaskStatus; label: string }[] = [
    { status: "todo", label: "To Do" },
    { status: "in_progress", label: "In Progress" },
    { status: "done", label: "Done" },
  ];

  return (
    <>
      <Topbar title={category.name} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/categories"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {category.description}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            const statusMeta = TASK_STATUSES.find(
              (s) => s.value === col.status,
            );
            return (
              <div
                key={col.status}
                className="bg-gray-100 dark:bg-gray-900/50 rounded-xl p-4 min-h-[300px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={statusMeta?.color}>{col.label}</Badge>
                    <span className="text-xs text-gray-400">
                      {colTasks.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => {
                    const prioInfo = TASK_PRIORITIES.find(
                      (p) => p.value === task.priority,
                    );
                    return (
                      <div
                        key={task.id}
                        onClick={() => {
                          setShowDetail(task);
                          setAiResult("");
                        }}
                        className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={prioInfo?.color}>
                            {prioInfo?.label}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            {task.due_date && (
                              <span className="text-xs text-gray-400">
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {(task.assignee as any)?.full_name && (
                              <div
                                className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-medium"
                                title={(task.assignee as any).full_name}
                              >
                                {(task.assignee as any).full_name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

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
                    Assigned To
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {(showDetail.assignee as any)?.full_name || "Unassigned"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Due Date
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {showDetail.due_date
                      ? new Date(showDetail.due_date).toLocaleDateString()
                      : "No due date"}
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
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={applyAIDescription}>
                          Apply as Description
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setAiResult("")}
                        >
                          Dismiss
                        </Button>
                      </div>
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
