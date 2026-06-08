"use client";

import { Plus, Key, Trash2, Copy, Eye, EyeOff, BookOpen } from "lucide-react";
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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ApiKeyRow {
  id: string;
  name: string;
  last_used_at?: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const fetchApiKeys = async () => {
    try {
      const data = await api.get<ApiKeyRow[]>("/api/apikey/get");
      setApiKeys(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch API keys");
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post<{ key: string }>("/api/apikey/generate", { name });
      setNewKey(data.key);
      toast.success("API key created — copy it now.");
      setName("");
      fetchApiKeys();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate key");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete("/api/apikey/delete", { apiKeyId: id });
      toast.success("API key removed");
      fetchApiKeys();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API keys</h1>
          <p className="text-muted-foreground">
            Issue keys for{" "}
            <code className="text-xs bg-muted px-1 rounded">POST /api/complaints/create</code>
            . Routing follows your tenant strategy in{" "}
            <Link href="/dashboard/settings" className="text-[#8c6d4e] hover:underline">
              Settings
            </Link>
            .{" "}
            <Link
              href="/dashboard/api-docs"
              className="text-[#8c6d4e] hover:underline inline-flex items-center gap-1"
            >
              <BookOpen className="h-3 w-3" />
              Docs
            </Link>
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="bg-[#3d2a1c] hover:bg-[#2a1d14] text-[#faf6f2]">
              <Plus className="mr-2 h-4 w-4" /> New API key
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-[#faf6f2] p-4">
            <SheetHeader>
              <SheetTitle>Create API key</SheetTitle>
              <SheetDescription>
                Use Bearer authentication. Keys are shown once — store them in a secret
                manager.
              </SheetDescription>
            </SheetHeader>

            {newKey ? (
              <div className="mt-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-900 mb-2">
                    Copy this key now — it won&apos;t be shown again.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={newKey}
                      readOnly
                      className="bg-white font-mono text-sm"
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
                  className="w-full"
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
                  <Label htmlFor="keyName">Label</Label>
                  <Input
                    id="keyName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Production · Mobile app"
                    required
                    className="bg-white mt-2"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#c9a382] hover:bg-[#b08e70]"
                  disabled={loading}
                >
                  {loading ? "Creating…" : "Generate"}
                </Button>
              </form>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>Active keys</CardTitle>
          <CardDescription>Rotate keys periodically for production workloads.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No keys yet. Create one to call the complaint API from your product.
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(key.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
