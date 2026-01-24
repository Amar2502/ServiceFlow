// src/app/login/page.tsx
"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { motion } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
        "http://localhost:5000/api/auth/login",
        formData,
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
              Welcome
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
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
                  <div className="flex justify-between">
                    <Label htmlFor="password" className="text-[#5a3e2b]">
                      Password
                    </Label>
                    <Dialog>
                      <DialogTrigger className="text-sm text-[#8c6d4e] hover:underline cursor-pointer">
                        Forgot password?
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl text-center text-[#5a3e2b] mb-2">
                            Reset Your Password
                          </DialogTitle>

                          <DialogDescription className="text-center text-sm text-muted-foreground">
                            We&apos;ll help you get back into your account in just a few steps.
                          </DialogDescription>

                          <div className="space-y-4 pt-4">
                            <div className="space-y-3 p-2">
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="bg-[#f7f2ea] p-7 rounded-lg border border-[#e0d0b7]"
                              >
                                <Label
                                  htmlFor="reset-email"
                                  className="text-[#5a3e2b] block mb-4"
                                >
                                  Enter your registered email
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="reset-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    className="border-[#d6bfa0] focus-visible:ring-[#8c6d4e] pl-9 my-2"
                                  />
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8c6d4e]" />
                                </div>
                                <Button
                                  type="button"
                                  className="bg-[#8c6d4e] hover:bg-[#725a3f] text-white w-full mt-3"
                                >
                                  Verify Email
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
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
                    {loading ? "Signing in..." : "Sign in"}{" "}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </div>
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-[#5a3e2b]">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-[#8c6d4e] font-semibold hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-[#5a3e2b]">
            By continuing, you agree to our{" "}
            <Link
              href="#"
              className="text-[#8c6d4e] underline hover:text-[#725a3f]"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="#"
              className="text-[#8c6d4e] underline hover:text-[#725a3f]"
            >
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}