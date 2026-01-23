"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenantName: "",
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Note: This would need tenantId from auth context
      await axios.put(
        "http://localhost:5000/api/tenant/update",
        {
          tenantId: "", // Would come from auth context
          name: formData.tenantName,
        },
        { withCredentials: true }
      );
      toast.success("Tenant updated successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your tenant settings and preferences.
        </p>
      </div>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
          <CardDescription>
            Update your organization's name and details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="tenantName">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tenantName"
                type="text"
                placeholder="Enter organization name"
                value={formData.tenantName}
                onChange={(e) =>
                  setFormData({ ...formData, tenantName: e.target.value })
                }
                required
                className="bg-white mt-2"
              />
            </div>

            <Button
              type="submit"
              className="bg-[#c9a382] hover:bg-[#b08e70]"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

