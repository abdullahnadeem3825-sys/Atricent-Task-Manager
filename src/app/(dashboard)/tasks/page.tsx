"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  DragDropContext,
  Droppable as BaseDroppable,
  Draggable,
  DropResult,
  DroppableProps,
} from "@hello-pangea/dnd";
import { useSupabase } from "@/hooks/useSupabase";
import { useUser } from "@/hooks/useUser";
import Topbar from "@/components/layout/Topbar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import MultiSelect from "@/components/ui/MultiSelect";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import {
  DEFAULT_TASK_STATUSES,
  TASK_PRIORITIES,
  AI_TASK_ACTIONS,
  COLUMN_COLORS,
} from "@/lib/constants";
import type {
  Task,
  Category,
  Profile,
  TaskStatus,
  TaskStatusColumn,
} from "@/types";

// ─── Task Card ──────────────────────────────────────────────
const TaskCard = ({
  task,
  index,
  onClick,
}: {
  task: Task;
  index: number;
  onClick: (t: Task) => void;
}) => {
  const prioInfo = TASK_PRIORITIES.find((p) => p.value === task.priority);
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          style={{
            ...provided.draggableProps.style,
            zIndex: snapshot.isDragging
              ? 50
              : (provided.draggableProps.style as any)?.zIndex,
          }}
          className={`bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md group relative select-none touch-none ${
            snapshot.isDragging
              ? "border-blue-500 shadow-xl ring-1 ring-blue-500/20 z-50 cursor-grabbing bg-blue-50/5 dark:bg-blue-900/5"
              : "cursor-grab"
          }`}
        >
          <div className="flex justify-between items-start mb-2 pointer-events-none">
            <Badge className={`${prioInfo?.color} text-[10px] px-1.5 py-0`}>
              {prioInfo?.label}
            </Badge>
            <div className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: (task.category as any)?.color || "#3B82F6",
                }}
              />
              <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
                {(task.category as any)?.name}
              </span>
            </div>
          </div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
              {task.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex -space-x-1.5 overflow-hidden">
              {(task.assignees || []).map((assigneeWrapper: any) => {
                const profile = assigneeWrapper.profile || assigneeWrapper; // Handle both wrapped and direct structures if any
                return (
                  <div
                    key={profile.id}
                    className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-white dark:border-gray-800 flex items-center justify-center text-[8px] font-bold text-blue-600 dark:text-blue-400"
                    title={profile.full_name}
                  >
                    {profile.full_name?.charAt(0) || "?"}
                  </div>
                );
              })}
              {(!task.assignees || task.assignees.length === 0) && (
                <span className="text-[10px] text-gray-400">Unassigned</span>
              )}
            </div>
            {task.due_date && (
              <div className="text-[10px] text-gray-400 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {new Date(task.due_date).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
TaskCard.displayName = "TaskCard";

// ─── Strict Mode Droppable Fix ──────────────────────────────
const Droppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <BaseDroppable {...props}>{children}</BaseDroppable>;
};

// ─── Column Settings Item (draggable row in settings modal) ─
const ColumnSettingsItem = ({
  col,
  index,
  onDelete,
  isAdmin,
}: {
  col: TaskStatusColumn;
  index: number;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}) => (
  <Draggable draggableId={`col-${col.id}`} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        className={`flex items-center gap-3 p-3 rounded-lg border ${
          snapshot.isDragging
            ? "border-blue-500 shadow-lg bg-white dark:bg-gray-800 z-50"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        }`}
      >
        {/* Drag handle */}
        <div
          {...provided.dragHandleProps}
          className="flex flex-col gap-0.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>

        {/* Color dot */}
        <div
          className={`w-3 h-3 rounded-full flex-shrink-0 ${col.color.split(" ")[0]}`}
        />

        {/* Label */}
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
          {col.label}
        </span>

        {/* Value badge */}
        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono">
          {col.value}
        </span>

        {/* Default badge */}
        {col.is_default && (
          <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">
            Default
          </span>
        )}

        {/* Delete button (only for non-default, admin only) */}
        {isAdmin && !col.is_default && (
          <button
            onClick={() => onDelete(col.id)}
            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Delete column"
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
        )}
      </div>
    )}
  </Draggable>
);

// ═══════════════════════════════════════════════════════════════
// ─── Main Tasks Page ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function TasksPage() {
  const supabase = useSupabase();
  const { profile, isAdmin, loading: userLoading } = useUser();

  // Core data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<TaskStatusColumn[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & UI
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showDetail, setShowDetail] = useState<Task | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [members, setMembers] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignees: [] as string[],
    priority: 2,
    due_date: "",
    category_id: "",
    status: "",
  });
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // New column form state
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [newColumn, setNewColumn] = useState({
    label: "",
    color: COLUMN_COLORS[0].value,
  });
  const [savingColumn, setSavingColumn] = useState(false);

  // ─── Data Fetching ────────────────────────────────────────
  const fetchStatuses = useCallback(async () => {
    const { data, error } = await supabase
      .from("task_statuses")
      .select("*")
      .order("position", { ascending: true });

    if (error || !data || data.length === 0) {
      setStatuses(
        DEFAULT_TASK_STATUSES.map((s, i) => ({
          id: s.value,
          value: s.value,
          label: s.label,
          color: s.color,
          position: i,
          is_default: true,
          created_at: new Date().toISOString(),
        })),
      );
    } else {
      setStatuses(data);
    }
  }, [supabase]);

  const fetchData = useCallback(async () => {
    // Try fetching with assignees join first
    let taskResult = await supabase
      .from("tasks")
      .select(
        "*, category:categories(id, name, color), assignees:task_assignees(profile:profiles(id, full_name, email))",
      )
      .order("created_at", { ascending: false });

    // If join fails (e.g. task_assignees table missing), fall back to simple query
    if (taskResult.error) {
      console.warn(
        "task_assignees join failed, falling back:",
        taskResult.error.message,
      );
      taskResult = await supabase
        .from("tasks")
        .select("*, category:categories(id, name, color)")
        .order("created_at", { ascending: false });
    }

    const { data: catData } = await supabase.from("categories").select("*");

    // Transform assignees
    const formattedTasks = (taskResult.data || []).map((t: any) => ({
      ...t,
      assignees: t.assignees?.map((a: any) => a.profile).filter(Boolean) || [],
    }));

    setTasks(formattedTasks);
    setCategories(catData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchStatuses();
    fetchData();
    fetchAllUsers();
  }, [fetchStatuses, fetchData]);

  useEffect(() => {
    if (statuses.length > 0 && !newTask.status) {
      setNewTask((p) => ({ ...p, status: statuses[0].value }));
    }
  }, [statuses]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Members ──────────────────────────────────────────────
  // ─── Members (All Users) ────────────────────────────────
  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email");
    if (error) {
      setMembers([]);
    } else {
      setMembers(data || []);
    }
  };

  // ─── Task CRUD ────────────────────────────────────────────
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.category_id) {
      toast("Select a category", "error");
      return;
    }

    // Ensure status is valid
    const statusToUse = newTask.status || statuses[0]?.value || "todo";

    setSaving(true);

    // 1. Create task
    const { data: createdTask, error } = await supabase
      .from("tasks")
      .insert({
        title: newTask.title,
        description: newTask.description || null,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        category_id: newTask.category_id,
        status: statusToUse,
        created_by: profile?.id,
      })
      .select()
      .single();

    if (error) {
      toast(error.message, "error");
    } else if (createdTask) {
      // 2. Add assignees
      if (newTask.assignees.length > 0) {
        const { error: assignError } = await supabase
          .from("task_assignees")
          .insert(
            newTask.assignees.map((userId) => ({
              task_id: createdTask.id,
              user_id: userId,
            })),
          );
        if (assignError) console.error("Error adding assignees:", assignError);
      }

      toast("Task created", "success");
      setShowCreate(false);
      setNewTask({
        title: "",
        description: "",
        assignees: [],
        priority: 2,
        due_date: "",
        category_id: "",
        status: statuses[0]?.value || "",
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

  // ─── AI Actions ───────────────────────────────────────────
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

  // ─── Kanban Columns (memoized) ────────────────────────────
  const kanbanColumns = useMemo(() => {
    const columns: Record<string, Task[]> = {};
    statuses.forEach((s) => {
      columns[s.value] = [];
    });
    tasks.forEach((t) => {
      if (filterCategory === "all" || t.category_id === filterCategory) {
        if (columns[t.status]) {
          columns[t.status].push(t);
        }
      }
    });
    return columns;
  }, [tasks, filterCategory, statuses]);

  // ─── Drag End Handler (tasks between columns) ────────────
  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const newStatus = destination.droppableId as TaskStatus;
    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t)),
    );
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", draggableId);
    if (error) {
      toast("Failed to update status", "error");
      fetchData();
    }
  };

  // ─── Column Management ───────────────────────────────────
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumn.label.trim()) {
      toast("Enter a column name", "error");
      return;
    }

    const value = newColumn.label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    if (statuses.some((s) => s.value === value)) {
      toast("Column with that name already exists", "error");
      return;
    }

    setSavingColumn(true);
    const { error } = await supabase.from("task_statuses").insert({
      value,
      label: newColumn.label.trim(),
      color: newColumn.color,
      position: statuses.length,
      is_default: false,
    });

    if (error) {
      toast(error.message, "error");
    } else {
      toast("Column created", "success");
      setNewColumn({ label: "", color: COLUMN_COLORS[0].value });
      setShowNewColumn(false);
      fetchStatuses();
    }
    setSavingColumn(false);
  };

  const handleDeleteColumn = async (colId: string) => {
    const col = statuses.find((s) => s.id === colId);
    if (!col) return;

    const tasksInColumn = tasks.filter((t) => t.status === col.value);
    if (tasksInColumn.length > 0) {
      toast(
        `Move ${tasksInColumn.length} task(s) out of "${col.label}" first`,
        "error",
      );
      return;
    }

    if (!confirm(`Delete column "${col.label}"? This cannot be undone.`))
      return;

    const { error } = await supabase
      .from("task_statuses")
      .delete()
      .eq("id", colId);
    if (error) {
      toast(error.message, "error");
    } else {
      toast("Column deleted", "success");
      fetchStatuses();
    }
  };

  const onSettingsDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    const reordered = Array.from(statuses);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    const updated = reordered.map((col, i) => ({ ...col, position: i }));
    setStatuses(updated);

    // Persist to DB
    await Promise.all(
      updated.map((col) =>
        supabase
          .from("task_statuses")
          .update({ position: col.position })
          .eq("id", col.id),
      ),
    );
    toast("Column order saved", "success");
  };

  // ─── Loading ──────────────────────────────────────────────
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
      <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
        {/* ─── Header Bar ────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
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
              {tasks.length} total tasks
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Columns
            </button>
            {/* New Task Button */}
            <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
          </div>
        </div>

        {/* ─── Kanban Board ──────────────────────────────────── */}
        <div className="flex-1 overflow-x-auto min-h-0">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full min-w-max pb-4">
              {statuses.map((status) => (
                <div
                  key={status.value}
                  className="w-80 flex flex-col h-full bg-gray-100 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-3"
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${status.color.split(" ")[0]}`}
                      />
                      <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                        {status.label}
                      </h3>
                      <span className="text-xs text-gray-400 font-normal">
                        {kanbanColumns[status.value]?.length || 0}
                      </span>
                    </div>
                  </div>

                  <Droppable droppableId={status.value} type="TASK">
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 flex flex-col gap-3 min-h-[200px] rounded-lg p-1 ${
                          snapshot.isDraggingOver
                            ? "bg-gray-200/50 dark:bg-gray-800/20"
                            : ""
                        }`}
                      >
                        {(kanbanColumns[status.value] || []).map(
                          (task, index) => (
                            <div
                              key={task.id}
                              className="transition-transform duration-200 ease-out"
                            >
                              <TaskCard
                                task={task}
                                index={index}
                                onClick={setShowDetail}
                              />
                            </div>
                          ),
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>

        {/* ─── Column Settings Modal ─────────────────────────── */}
        <Modal
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false);
            setShowNewColumn(false);
          }}
          title="Board Columns"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drag columns to reorder them on the board.{" "}
              {isAdmin ? "Admins can add or remove custom columns." : ""}
            </p>

            {/* Draggable column list */}
            <DragDropContext onDragEnd={onSettingsDragEnd}>
              <Droppable droppableId="column-settings" type="COLUMN">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {statuses.map((col, index) => (
                      <ColumnSettingsItem
                        key={col.id}
                        col={col}
                        index={index}
                        onDelete={handleDeleteColumn}
                        isAdmin={isAdmin}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Add New Column */}
            {isAdmin && !showNewColumn && (
              <button
                onClick={() => setShowNewColumn(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors text-sm font-medium"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add New Column
              </button>
            )}

            {isAdmin && showNewColumn && (
              <form
                onSubmit={handleCreateColumn}
                className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 space-y-3"
              >
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  New Column
                </h4>
                <Input
                  label="Column Name"
                  value={newColumn.label}
                  onChange={(e) =>
                    setNewColumn((p) => ({ ...p, label: e.target.value }))
                  }
                  placeholder="e.g. In Review, Testing, Blocked"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLUMN_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          setNewColumn((p) => ({ ...p, color: c.value }))
                        }
                        className={`w-8 h-8 rounded-full ${c.dot} transition-all ${
                          newColumn.color === c.value
                            ? "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900 scale-110"
                            : "hover:scale-105"
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setShowNewColumn(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingColumn}>
                    {savingColumn ? "Creating..." : "Create Column"}
                  </Button>
                </div>
              </form>
            )}

            {/* Close */}
            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSettings(false);
                  setShowNewColumn(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>

        {/* ─── Create Task Modal ─────────────────────────────── */}
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
                // No longer filter members by category
              }}
              options={[
                { value: "", label: "Select Category" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Select
              label="Status"
              value={newTask.status || statuses[0]?.value || ""}
              onChange={(e) =>
                setNewTask((p) => ({ ...p, status: e.target.value }))
              }
              options={statuses.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
            />
            <MultiSelect
              label="Assign To"
              selectedValues={newTask.assignees}
              onChange={(values) =>
                setNewTask((p) => ({ ...p, assignees: values }))
              }
              options={members.map((m) => ({
                value: m.id,
                label: m.full_name,
              }))}
              placeholder="Select assignees..."
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

        {/* ─── Task Detail Modal ─────────────────────────────── */}
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
                    options={statuses.map((s) => ({
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
                    Assignees
                  </label>
                  <div className="flex -space-x-1.5 overflow-hidden mt-1 pl-1">
                    {showDetail.assignees && showDetail.assignees.length > 0 ? (
                      showDetail.assignees.map((assigneeWrapper: any) => {
                        const profile =
                          assigneeWrapper.profile || assigneeWrapper;
                        return (
                          <div
                            key={profile.id}
                            className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400"
                            title={profile.full_name}
                          >
                            {profile.full_name?.charAt(0) || "?"}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-white">
                        Unassigned
                      </p>
                    )}
                  </div>
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
