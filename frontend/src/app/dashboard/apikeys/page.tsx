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

export default function ApiKeysPage() {
  const { data: apiKeys = [], isLoading } = useApiKeys();
  const generateMutation = useGenerateApiKey();
  const deleteMutation = useDeleteApiKey();

  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await generateMutation.mutateAsync({ name });
      const generatedKey = res.apiKey || (res as any).key;
      setNewKey(generatedKey);
      setName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate API key");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ apiKeyId: id });
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="flex-1 overflow-auto space-y-5">
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3d2a1c]">API Bearer Credentials</h1>
          <p className="text-xs text-slate-500">
            Issue API keys for programmatic complaint ingestion via{" "}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">POST /api/complaints/create</code>.
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2] text-xs font-medium">
              <Plus className="mr-1.5 h-4 w-4" /> Generate New Key
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-[#faf6f2] p-4">
            <SheetHeader>
              <SheetTitle>Generate API Key</SheetTitle>
              <SheetDescription>
                Keys are shown once. Store your key securely in a secret manager.
              </SheetDescription>
            </SheetHeader>

            {newKey ? (
              <div className="mt-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-amber-900 mb-2">
                    ⚠️ Copy this API key now — it will not be shown again.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={newKey}
                      readOnly
                      className="bg-white font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full text-xs"
                  variant="secondary"
                  onClick={() => {
                    setNewKey(null);
                    setShowKey(false);
                  }}
                >
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="keyName" className="text-xs font-semibold">Key Label / System Name</Label>
                  <Input
                    id="keyName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Production Mobile App / Customer Web Portal"
                    required
                    className="bg-white mt-1.5 text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#3d2a1c] hover:bg-[#2a1d14] text-white text-xs font-medium"
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? "Generating..." : "Generate Credentials"}
                </Button>
              </form>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <Card className="bg-white border-[#EED9C4] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#5a3e2b]">Active Tenant API Keys</CardTitle>
          <CardDescription>Revoke compromised keys immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-xs text-slate-400">Loading API keys...</div>
          ) : (
            <div className="rounded-md border border-[#EED9C4] overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#faf6f2]">
                  <TableRow>
                    <TableHead className="text-left">Label</TableHead>
                    <TableHead className="text-left">Key Prefix</TableHead>
                    <TableHead className="text-left">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-xs text-slate-400">
                        No API keys generated yet. Click &quot;Generate New Key&quot; above to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    apiKeys.map((key) => (
                      <TableRow key={key.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-semibold text-slate-900">{key.name}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">{key.key_prefix || "sk_live_***"}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(key.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(key.id)}
                            className="text-red-600 hover:text-red-700 text-xs"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Revoke Key
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
  );
}
