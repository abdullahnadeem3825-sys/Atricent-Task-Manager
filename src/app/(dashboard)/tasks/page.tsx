"use client";

import { useState, useEffect, useMemo, memo } from "react";
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
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  AI_TASK_ACTIONS,
} from "@/lib/constants";
import type { Task, Category, Profile, TaskStatus } from "@/types";

// Memoized Task Card for performance
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
            // Only modify zIndex during drag, leave the rest to the library
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
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {((task.assignee as any)?.full_name || "?").charAt(0)}
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                {(task.assignee as any)?.full_name || "Unassigned"}
              </span>
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

// Wrapper to fix React 18+ / Next.js Strict Mode issues with dnd
const Droppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) {
    return null;
  }
  return <BaseDroppable {...props}>{children}</BaseDroppable>;
};

export default function TasksPage() {
  const supabase = useSupabase();
  const { profile, isAdmin, loading: userLoading } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
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

  const kanbanColumns = useMemo(() => {
    const columns: Record<string, Task[]> = {};
    TASK_STATUSES.forEach((s) => {
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
  }, [tasks, filterCategory]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;

    // Optimistic Update: Update local state immediately
    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t)),
    );

    // Perform database update in the background
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", draggableId);

    if (error) {
      toast("Failed to update status", "error");
      // Revert on error if necessary, though simpler to just notify for now
      fetchData();
    }
  };

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
          <Button onClick={() => setShowCreate(true)}>+ New Task</Button>
        </div>

        <div className="flex-1 overflow-x-auto min-h-0">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full min-w-max pb-4">
              {TASK_STATUSES.map((status) => (
                <div
                  key={status.value}
                  className="w-80 flex flex-col h-full bg-gray-100 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 p-3"
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${status.color.replace("text-", "bg-")}`}
                      />
                      <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                        {status.label}
                      </h3>
                      <span className="text-xs text-gray-400 font-normal">
                        {kanbanColumns[status.value].length}
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
                        {kanbanColumns[status.value].map((task, index) => (
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
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
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
