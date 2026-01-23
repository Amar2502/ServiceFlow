"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import axios from "axios";
import Link from "next/link";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    title: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/invite/login",
        {
          ...formData,
          token,
        },
        { withCredentials: true }
      );

      if (response.data) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#f2dab6] to-[#e8c9a0] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-6">
              <Link href="/">
                <h2 className="text-3xl font-bold text-[#5a3e2b]">
                  ServiceFlow
                </h2>
              </Link>
            </div>
            <CardTitle className="text-2xl text-center text-[#5a3e2b]">
              Accept Invitation
            </CardTitle>
            <CardDescription className="text-center">
              Complete your registration to join the team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#5a3e2b]">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="border-[#d6bfa0] focus-visible:ring-[#8c6d4e]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#5a3e2b]">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="border-[#d6bfa0] focus-visible:ring-[#8c6d4e]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[#5a3e2b]">
                    Job Title
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    placeholder="e.g., Support Agent, Manager"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="border-[#d6bfa0] focus-visible:ring-[#8c6d4e]"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="password" className="text-[#5a3e2b]">
                      Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="border-[#d6bfa0] focus-visible:ring-[#8c6d4e] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#8c6d4e] hover:bg-[#725a3f] text-white"
                  disabled={loading}
                >
                  <div className="flex items-center justify-center">
                    {loading ? "Creating account..." : "Accept Invitation"}{" "}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </div>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

