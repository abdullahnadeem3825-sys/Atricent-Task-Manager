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
import type { Announcement } from "@/types";

export default function AnnouncementsPage() {
  const supabase = useSupabase();
  const { profile, isAdmin, loading: userLoading } = useUser();
  const [announcements, setAnnouncements] = useState<
    (Announcement & { is_read: boolean })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAnn, setNewAnn] = useState({
    title: "",
    content: "",
    priority: "info" as const,
  });

  const fetchAnnouncements = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("announcements")
      .select("*, author:profiles!created_by(full_name, email)")
      .order("created_at", { ascending: false });

    const { data: reads } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", profile.id);

    const readIds = new Set(reads?.map((r) => r.announcement_id) || []);

    setAnnouncements(
      (data || []).map((a) => ({ ...a, is_read: readIds.has(a.id) })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (profile) fetchAnnouncements();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = async (announcementId: string) => {
    if (!profile) return;
    const announcement = announcements.find((a) => a.id === announcementId);
    if (announcement?.is_read) return;

    await supabase.from("announcement_reads").insert({
      announcement_id: announcementId,
      user_id: profile.id,
    });

    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, is_read: true } : a)),
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("announcements").insert({
      title: newAnn.title,
      content: newAnn.content,
      priority: newAnn.priority,
      created_by: profile?.id,
    });
    if (error) {
      toast(error.message, "error");
    } else {
      toast("Announcement posted", "success");
      setShowCreate(false);
      setNewAnn({ title: "", content: "", priority: "info" });
      fetchAnnouncements();
    }
    setSaving(false);
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    toast("Announcement deleted", "success");
    fetchAnnouncements();
  };

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="danger">Urgent</Badge>;
      case "warning":
        return <Badge variant="warning">Warning</Badge>;
      default:
        return <Badge variant="info">Info</Badge>;
    }
  };

  if (userLoading || loading) {
    return (
      <>
        <Topbar title="Announcements" />
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Announcements" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500 dark:text-gray-400">
            {announcements.filter((a) => !a.is_read).length} unread
          </p>
          {isAdmin && (
            <Button onClick={() => setShowCreate(true)}>
              + New Announcement
            </Button>
          )}
        </div>

        {announcements.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📢</div>
            <p className="text-gray-500 dark:text-gray-400">
              No announcements yet
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-all ${
                  !announcement.is_read ? "border-l-4 border-l-blue-500" : ""
                }`}
                onClick={() => markAsRead(announcement.id)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {priorityBadge(announcement.priority)}
                        {!announcement.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <h3
                        className={`text-lg font-semibold text-gray-900 dark:text-white ${!announcement.is_read ? "font-bold" : ""}`}
                      >
                        {announcement.title}
                      </h3>
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {announcement.content}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                        <span>{(announcement.author as any)?.full_name}</span>
                        <span>·</span>
                        <span>
                          {new Date(announcement.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnnouncement(announcement.id);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Announcement Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="New Announcement"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Title"
              value={newAnn.title}
              onChange={(e) =>
                setNewAnn((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Announcement title"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content
              </label>
              <textarea
                value={newAnn.content}
                onChange={(e) =>
                  setNewAnn((p) => ({ ...p, content: e.target.value }))
                }
                placeholder="Announcement content..."
                rows={5}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>
            <Select
              label="Priority"
              value={newAnn.priority}
              onChange={(e) =>
                setNewAnn((p) => ({ ...p, priority: e.target.value as any }))
              }
              options={[
                { value: "info", label: "Info" },
                { value: "warning", label: "Warning" },
                { value: "urgent", label: "Urgent" },
              ]}
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
                {saving ? "Posting..." : "Post Announcement"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}
