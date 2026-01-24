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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  routing_mode: "DEPARTMENT" | "EMPLOYEE";
  created_at: string;
  last_used_at?: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    routingMode: "DEPARTMENT",
  });
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const fetchApiKeys = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/apikey/get",
        { withCredentials: true }
      );
      setApiKeys(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/apikey/generate",
        formData,
        { withCredentials: true }
      );
      setNewKey(response.data.key);
      toast.success("API key generated successfully");
      setFormData({ name: "", routingMode: "DEPARTMENT" });
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to generate API key");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete("http://localhost:5000/api/apikey/delete", {
        data: { apiKeyId: id },
        withCredentials: true,
      });
      toast.success("API key deleted successfully");
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("API key copied to clipboard");
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic complaint submission.{" "}
            <Link
              href="/dashboard/api-docs"
              className="text-[#8c6d4e] hover:underline inline-flex items-center gap-1"
            >
              <BookOpen className="h-3 w-3" />
              View API Documentation
            </Link>
          </p>
        </div>
        <div>
          <Sheet>
            <SheetTrigger className="bg-[#eac4a3] hover:bg-[#b08e70] p-2 flex items-center rounded-md">
              <Plus className="mr-2 h-4 w-4" /> Generate API Key
            </SheetTrigger>
            <SheetContent className="bg-[#faf6f2] p-4">
              <SheetHeader>
                <SheetTitle>Generate New API Key</SheetTitle>
                <SheetDescription>
                  Create an API key for programmatic complaint submission.
                </SheetDescription>
              </SheetHeader>

              {newKey ? (
                <div className="mt-6 space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      ⚠️ Save this key now. You won't be able to see it again!
                    </p>
                    <div className="flex items-center space-x-2">
                      <Input
                        type={showKey ? "text" : "password"}
                        value={newKey}
                        readOnly
                        className="bg-white font-mono"
                      />
                      <Button
                        variant="outline"
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
                    className="w-full bg-[#c9a382] hover:bg-[#b08e70]"
                    onClick={() => {
                      setNewKey(null);
                      setShowKey(false);
                    }}
                  >
                    Generate Another Key
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleGenerate} className="space-y-4 mt-6">
                  <div>
                    <Label htmlFor="name">
                      Key Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g., Production API Key"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="bg-white mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="routingMode">
                      Routing Mode <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.routingMode}
                      onValueChange={(value: "DEPARTMENT" | "EMPLOYEE") =>
                        setFormData({ ...formData, routingMode: value })
                      }
                    >
                      <SelectTrigger className="bg-white mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEPARTMENT">Department</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      How complaints should be routed when submitted via this key
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#c9a382] hover:bg-[#b08e70]"
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "Generate API Key"}
                  </Button>
                </form>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage your API keys for programmatic access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Routing Mode</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No API keys found. Generate one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {key.routing_mode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(key.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(key.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
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

