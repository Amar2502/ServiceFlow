"use client";

import { Plus, Trash2, Copy, Eye, EyeOff, BookOpen } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { useApiKeys, useGenerateApiKey, useDeleteApiKey } from "@/hooks/use-apikeys";
import { RbacGuard } from "@/components/rbac-guard";

export default function ApiKeysPage() {
  const { data: apiKeys = [], isLoading } = useApiKeys();
  const generateMutation = useGenerateApiKey();
  const deleteMutation = useDeleteApiKey();

  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const result = await generateMutation.mutateAsync({ name: name.trim() });
      setNewKey(result.apiKey);
      setName("");
      toast.success("API Key generated successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate API Key");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ apiKeyId: id });
      toast.success("API Key revoked successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke API Key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("API Key copied to clipboard");
  };

  return (
    <RbacGuard allowedRoles={["ADMIN"]}>
      <div className="flex-1 overflow-auto space-y-5">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">
              API Key Credentials & Access Control
            </h1>
            <p className="text-sm text-slate-500">
              Manage Bearer tokens for external REST ingestion endpoints.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/api-docs">
              <Button variant="outline" className="bg-white text-xs">
                <BookOpen className="mr-1.5 h-3.5 w-3.5" /> View API Reference
              </Button>
            </Link>

            <Sheet>
              <SheetTrigger asChild>
                <Button className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2] text-xs font-medium">
                  <Plus className="mr-1.5 h-4 w-4" /> Generate New API Key
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-[#faf6f2] p-4">
                <SheetHeader>
                  <SheetTitle>Generate API Key</SheetTitle>
                  <SheetDescription>
                    Create a new Bearer API Key for automated complaint intake.
                  </SheetDescription>
                </SheetHeader>

                {newKey ? (
                  <div className="mt-6 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-2">
                      <p className="text-xs font-bold text-amber-900">
                        ⚠️ Copy your secret API Key now!
                      </p>
                      <p className="text-xs text-amber-800">
                        It will not be displayed again for security reasons.
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          type={showKey ? "text" : "password"}
                          value={newKey}
                          readOnly
                          className="bg-white font-mono text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(newKey)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs"
                      onClick={() => setNewKey(null)}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleGenerate} className="space-y-4 mt-6">
                    <div>
                      <Label htmlFor="keyName" className="text-xs">
                        Key Descriptor / Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="keyName"
                        placeholder="e.g. Production Ingestion Service"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="bg-white text-xs mt-2"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs font-medium"
                      disabled={generateMutation.isPending}
                    >
                      {generateMutation.isPending ? "Generating..." : "Generate Key"}
                    </Button>
                  </form>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <Card className="bg-white border-[#EED9C4] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#5a3e2b]">Tenant API Keys</CardTitle>
            <CardDescription>
              Active Bearer tokens authorized for complaint creation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-xs text-slate-400">Loading API keys...</div>
            ) : (
              <div className="rounded-md border border-[#EED9C4] overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#faf6f2]">
                    <TableRow>
                      <TableHead className="text-left">Key Descriptor</TableHead>
                      <TableHead className="text-left">Key Prefix</TableHead>
                      <TableHead className="text-left">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-xs text-slate-400">
                          No active API keys found. Generate a key above to enable REST ingestion.
                        </TableCell>
                      </TableRow>
                    ) : (
                      apiKeys.map((key) => (
                        <TableRow key={key.id} className="hover:bg-slate-50">
                          <TableCell className="font-semibold text-xs text-slate-900">
                            {key.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">
                            {key.key_prefix || "sf_live_"}••••••••••••
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {new Date(key.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 text-xs"
                              onClick={() => handleDelete(key.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RbacGuard>
  );
}
