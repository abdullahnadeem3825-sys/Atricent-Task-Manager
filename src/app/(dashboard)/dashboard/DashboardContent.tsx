"use client";

import type { Profile, DashboardStats, Announcement, Task } from "@/types";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";

interface Props {
  profile: Profile;
  stats: DashboardStats;
  announcements: Announcement[];
  recentTasks: Task[];
}

export default function DashboardContent({
  profile,
  stats,
  announcements,
  recentTasks,
}: Props) {
  const isAdmin = profile.role === "admin";

  const statCards = [
    {
      label: "Categories",
      value: stats.totalCategories,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Total Tasks",
      value: stats.totalTasks,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      label: "To Do",
      value: stats.todoTasks,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
    },
    {
      label: "In Progress",
      value: stats.inProgressTasks,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
    },
    {
      label: "Done",
      value: stats.doneTasks,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
  ];

  if (isAdmin && stats.totalEmployees !== undefined) {
    statCards.push({
      label: "Employees",
      value: stats.totalEmployees,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {profile.full_name}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Here&apos;s what&apos;s happening in your workspace
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-xl p-4 border border-transparent`}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Recent Tasks
            </h3>
            <Link
              href="/tasks"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentTasks.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                No tasks yet
              </p>
            ) : (
              recentTasks.map((task) => {
                const statusInfo = TASK_STATUSES.find(
                  (s) => s.value === task.status,
                );
                const priorityInfo = TASK_PRIORITIES.find(
                  (p) => p.value === task.priority,
                );
                return (
                  <div
                    key={task.id}
                    className="px-5 py-3 flex items-center gap-3"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          (task.category as any)?.color || "#3B82F6",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(task.category as any)?.name} ·{" "}
                        {task.assignees && task.assignees.length > 0
                          ? task.assignees
                              .map((a: any) => a.full_name)
                              .join(", ")
                          : "Unassigned"}
                      </p>
                    </div>
                    <Badge className={priorityInfo?.color}>
                      {priorityInfo?.label}
                    </Badge>
                    <Badge className={statusInfo?.color}>
                      {statusInfo?.label}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Announcements
            </h3>
            <Link
              href="/announcements"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {announcements.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                No announcements yet
              </p>
            ) : (
              announcements.map((a) => {
                const priorityColors = {
                  info: "bg-blue-500",
                  warning: "bg-yellow-500",
                  urgent: "bg-red-500",
                };
                return (
                  <div
                    key={a.id}
                    className={`px-5 py-3 ${!a.is_read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${priorityColors[a.priority]}`}
                      />
                      <p
                        className={`text-sm font-medium text-gray-900 dark:text-white ${!a.is_read ? "font-semibold" : ""}`}
                      >
                        {a.title}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                      {a.content}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {(a.author as any)?.full_name} ·{" "}
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
