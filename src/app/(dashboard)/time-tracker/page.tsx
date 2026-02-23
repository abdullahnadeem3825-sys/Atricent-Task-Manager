"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { useUser } from "@/hooks/useUser";
import Topbar from "@/components/layout/Topbar";
import Spinner from "@/components/ui/Spinner";
import type { Profile } from "@/types";

// ─── Types ──────────────────────────────────────────────────
interface TaskWithTime {
  id: string;
  title: string;
  status: string;
  priority: number;
  category_id: string;
  estimated_hours: number | null;
  actual_hours: number | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; color: string };
  assignees: { id: string; full_name: string; email: string }[];
}

interface CategorySummary {
  id: string;
  name: string;
  color: string;
  estimated: number;
  actual: number;
  taskCount: number;
}

interface PersonSummary {
  id: string;
  name: string;
  estimated: number;
  actual: number;
  taskCount: number;
}

// ─── Bar Component ──────────────────────────────────────────
const ComparisonBar = ({
  label,
  estimated,
  actual,
  color,
  maxHours,
}: {
  label: string;
  estimated: number;
  actual: number;
  color?: string;
  maxHours: number;
}) => {
  const estWidth = maxHours > 0 ? (estimated / maxHours) * 100 : 0;
  const actWidth = maxHours > 0 ? (actual / maxHours) * 100 : 0;
  const diff = actual - estimated;
  const isOver = diff > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {color && (
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            Est: {estimated.toFixed(1)}h
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Act: {actual.toFixed(1)}h
          </span>
          <span
            className={`font-bold ${isOver ? "text-red-500" : "text-green-500"}`}
          >
            {isOver ? "+" : ""}
            {diff.toFixed(1)}h
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400/70 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, estWidth)}%` }}
          />
        </div>
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isOver ? "bg-red-400/70" : "bg-emerald-400/70"}`}
            style={{ width: `${Math.min(100, actWidth)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Stat Card ──────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
    <div className="flex items-center gap-3 mb-2">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
    {sub && (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
    )}
  </div>
);

// ─── Period filter ──────────────────────────────────────────
type Period = "week" | "month" | "quarter" | "all";

function getDateRange(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "quarter": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "all":
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// ─── Main Page ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function TimeVisualizerPage() {
  const supabase = useSupabase();
  const { loading: userLoading } = useUser();

  const [tasks, setTasks] = useState<TaskWithTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [viewTab, setViewTab] = useState<
    "overview" | "person" | "category" | "tasks"
  >("overview");

  // ─── Data Fetching ────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1. Fetch tasks with categories
      const { data: taskData } = await supabase
        .from("tasks")
        .select("*, category:categories(id, name, color)")
        .order("created_at", { ascending: false });

      // 2. Fetch all task_assignees (raw)
      const { data: assigneeRows } = await supabase
        .from("task_assignees")
        .select("task_id, user_id");

      // 3. Fetch all profiles
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      const profileMap = new Map(
        (allProfiles || []).map((p: any) => [p.id, p]),
      );

      // Build assignee map
      const taskAssigneeMap: Record<string, any[]> = {};
      for (const row of assigneeRows || []) {
        const profile = profileMap.get(row.user_id);
        if (profile) {
          if (!taskAssigneeMap[row.task_id]) taskAssigneeMap[row.task_id] = [];
          taskAssigneeMap[row.task_id].push(profile);
        }
      }

      // Merge
      const formatted: TaskWithTime[] = (taskData || []).map((t: any) => ({
        ...t,
        assignees: taskAssigneeMap[t.id] || [],
      }));

      setTasks(formatted);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  // ─── Filtered tasks by period ─────────────────────────────
  const filteredTasks = useMemo(() => {
    const since = getDateRange(period);
    if (!since) return tasks;
    return tasks.filter((t) => new Date(t.created_at) >= since);
  }, [tasks, period]);

  // Only tasks that have at least estimated or actual hours
  const trackedTasks = useMemo(
    () =>
      filteredTasks.filter(
        (t) => t.estimated_hours != null || t.actual_hours != null,
      ),
    [filteredTasks],
  );

  // ─── Summary stats ───────────────────────────────────────
  const totalEstimated = useMemo(
    () => trackedTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0),
    [trackedTasks],
  );
  const totalActual = useMemo(
    () => trackedTasks.reduce((s, t) => s + (t.actual_hours || 0), 0),
    [trackedTasks],
  );
  const overrun = totalActual - totalEstimated;
  const accuracy =
    totalEstimated > 0
      ? Math.round((1 - Math.abs(overrun) / totalEstimated) * 100)
      : 0;

  // ─── Per-category breakdown ───────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, CategorySummary> = {};
    for (const t of trackedTasks) {
      const cat = t.category as any;
      if (!cat) continue;
      if (!map[cat.id]) {
        map[cat.id] = {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          estimated: 0,
          actual: 0,
          taskCount: 0,
        };
      }
      map[cat.id].estimated += t.estimated_hours || 0;
      map[cat.id].actual += t.actual_hours || 0;
      map[cat.id].taskCount++;
    }
    return Object.values(map).sort((a, b) => b.actual - a.actual);
  }, [trackedTasks]);

  // ─── Per-person breakdown ─────────────────────────────────
  const personBreakdown = useMemo(() => {
    const map: Record<string, PersonSummary> = {};
    for (const t of trackedTasks) {
      for (const a of t.assignees) {
        if (!map[a.id]) {
          map[a.id] = {
            id: a.id,
            name: a.full_name,
            estimated: 0,
            actual: 0,
            taskCount: 0,
          };
        }
        // Split time evenly among assignees
        const share = t.assignees.length;
        map[a.id].estimated += (t.estimated_hours || 0) / share;
        map[a.id].actual += (t.actual_hours || 0) / share;
        map[a.id].taskCount++;
      }
    }
    return Object.values(map).sort((a, b) => b.actual - a.actual);
  }, [trackedTasks]);

  // max hours for scaling bars
  const maxCatHours = useMemo(
    () =>
      Math.max(...categoryBreakdown.flatMap((c) => [c.estimated, c.actual]), 1),
    [categoryBreakdown],
  );
  const maxPersonHours = useMemo(
    () =>
      Math.max(...personBreakdown.flatMap((p) => [p.estimated, p.actual]), 1),
    [personBreakdown],
  );

  // ─── Loading ──────────────────────────────────────────────
  if (userLoading || loading) {
    return (
      <>
        <Topbar title="Time Tracker" />
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Time Tracker" />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* ─── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Estimate vs. Actual Time
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Track how your time estimates compare to actual hours spent
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(["week", "month", "quarter", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  period === p
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {p === "all"
                  ? "All Time"
                  : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Summary Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Estimated"
            value={`${totalEstimated.toFixed(1)}h`}
            sub={`${trackedTasks.length} tracked tasks`}
            color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
            icon={
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="Actual"
            value={`${totalActual.toFixed(1)}h`}
            sub={`${filteredTasks.length} total tasks in period`}
            color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
            icon={
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            label="Variance"
            value={`${overrun >= 0 ? "+" : ""}${overrun.toFixed(1)}h`}
            sub={
              overrun > 0
                ? "Over estimated"
                : overrun < 0
                  ? "Under estimated"
                  : "On target"
            }
            color={
              overrun > 0
                ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                : "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
            }
            icon={
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
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            }
          />
          <StatCard
            label="Accuracy"
            value={`${accuracy}%`}
            sub="Estimation accuracy score"
            color="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
            icon={
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />
        </div>

        {/* ─── Overall Gauge ─────────────────────────────────── */}
        {totalEstimated > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Overall Time Utilization
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 w-20">
                  Estimated
                </span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (totalEstimated / Math.max(totalEstimated, totalActual)) * 100)}%`,
                    }}
                  >
                    {totalEstimated.toFixed(1)}h
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 w-20">
                  Actual
                </span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-700 ${totalActual > totalEstimated ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{
                      width: `${Math.min(100, (totalActual / Math.max(totalEstimated, totalActual)) * 100)}%`,
                    }}
                  >
                    {totalActual.toFixed(1)}h
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab Selector ──────────────────────────────────── */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(
            [
              { key: "overview", label: "Overview" },
              { key: "person", label: "Per Person" },
              { key: "category", label: "Per Project" },
              { key: "tasks", label: "Per Task" },
            ] as { key: typeof viewTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                viewTab === tab.key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ───────────────────────────────────── */}
        {trackedTasks.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              No time-tracked tasks yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Add estimated or actual hours to your tasks to see insights here
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {/* ─── Overview / Combined view ──────────────────── */}
            {viewTab === "overview" && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  By Project
                </h3>
                <div className="space-y-5">
                  {categoryBreakdown.map((cat) => (
                    <ComparisonBar
                      key={cat.id}
                      label={`${cat.name} (${cat.taskCount} tasks)`}
                      estimated={cat.estimated}
                      actual={cat.actual}
                      color={cat.color}
                      maxHours={maxCatHours}
                    />
                  ))}
                </div>

                {personBreakdown.length > 0 && (
                  <>
                    <hr className="border-gray-200 dark:border-gray-700" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      By Person
                    </h3>
                    <div className="space-y-5">
                      {personBreakdown.map((person) => (
                        <ComparisonBar
                          key={person.id}
                          label={`${person.name} (${person.taskCount} tasks)`}
                          estimated={person.estimated}
                          actual={person.actual}
                          maxHours={maxPersonHours}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─── Per Person ────────────────────────────────── */}
            {viewTab === "person" && (
              <div className="space-y-5">
                {personBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No person data available. Assign users to time-tracked
                    tasks.
                  </p>
                ) : (
                  personBreakdown.map((person) => (
                    <div
                      key={person.id}
                      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700"
                    >
                      <ComparisonBar
                        label={person.name}
                        estimated={person.estimated}
                        actual={person.actual}
                        maxHours={maxPersonHours}
                      />
                      <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{person.taskCount} tasks</span>
                        <span>
                          Accuracy:{" "}
                          {person.estimated > 0
                            ? `${Math.round((1 - Math.abs(person.actual - person.estimated) / person.estimated) * 100)}%`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── Per Category / Project ────────────────────── */}
            {viewTab === "category" && (
              <div className="space-y-5">
                {categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No category data available.
                  </p>
                ) : (
                  categoryBreakdown.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700"
                    >
                      <ComparisonBar
                        label={cat.name}
                        estimated={cat.estimated}
                        actual={cat.actual}
                        color={cat.color}
                        maxHours={maxCatHours}
                      />
                      <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>{cat.taskCount} tasks</span>
                        <span>
                          Accuracy:{" "}
                          {cat.estimated > 0
                            ? `${Math.round((1 - Math.abs(cat.actual - cat.estimated) / cat.estimated) * 100)}%`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── Per Task ──────────────────────────────────── */}
            {viewTab === "tasks" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Task
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Category
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Estimated
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actual
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Diff
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Assignees
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedTasks.map((task) => {
                      const est = task.estimated_hours || 0;
                      const act = task.actual_hours || 0;
                      const diff = act - est;
                      const cat = task.category as any;
                      return (
                        <tr
                          key={task.id}
                          className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white max-w-[250px] truncate">
                            {task.title}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: cat?.color || "#3B82F6",
                                }}
                              />
                              <span className="text-gray-600 dark:text-gray-400 text-xs">
                                {cat?.name || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">
                            {est > 0 ? `${est}h` : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                            {act > 0 ? `${act}h` : "—"}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-medium ${
                              diff > 0
                                ? "text-red-500"
                                : diff < 0
                                  ? "text-green-500"
                                  : "text-gray-400"
                            }`}
                          >
                            {est > 0 || act > 0
                              ? `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}h`
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex -space-x-1">
                              {task.assignees.length > 0 ? (
                                task.assignees.map((a) => (
                                  <div
                                    key={a.id}
                                    className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 border border-white dark:border-gray-800 flex items-center justify-center text-[8px] font-bold text-blue-600 dark:text-blue-400"
                                    title={a.full_name}
                                  >
                                    {a.full_name?.charAt(0) || "?"}
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
