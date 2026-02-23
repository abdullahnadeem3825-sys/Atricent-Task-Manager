"use client";

import Topbar from "@/components/layout/Topbar";
import { useUser } from "@/hooks/useUser";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const { profile } = useUser();

  return (
    <>
      <Topbar title="Settings" />
      <div className="p-6 max-w-2xl">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
            Profile Settings
          </h2>

          <div className="space-y-4">
            <Input
              label="Full Name"
              value={profile?.full_name || ""}
              disabled
            />
            <Input
              label="Email Address"
              value={profile?.email || ""}
              disabled
            />
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500 mb-4">
                Profile details are managed by your administrator. Contact HR if
                you need to update your primary information.
              </p>
              <Button variant="secondary" disabled>
                Update Preferences
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
