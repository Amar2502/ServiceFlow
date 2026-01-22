"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { motion } from "framer-motion"
import Link from 'next/link'
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function Register() {

  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    tenantName: "",
    password: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e:React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    const fieldName = id === "companyName" ? "tenantName" : id
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    setError("")
  }

  const handleSubmit = async (e:React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/register",
        formData,
        { withCredentials: true }
      )

      if (response.data) {
        router.push("/")
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "An error occurred. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

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
            <div className="flex justify-center mb-4">
              <Link href="/">
                <h2 className="text-3xl font-bold text-[#5a3e2b]">ResolveTrack</h2>
              </Link>
            </div>
            <CardTitle className="text-2xl text-center text-[#5a3e2b]">
              Create an account
            </CardTitle>
            <CardDescription className="text-center">
              Enter your information to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={formData.name} onChange={handleChange} required />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={formData.companyName} onChange={handleChange} required />
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} required />
                  <button type="button" onClick={() => setShowPassword(prev => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-6">
                <Checkbox id="terms" required />
                <label htmlFor="terms" className="text-sm">
                  I agree to the <Link href="#" className="text-[#8c6d4e] hover:underline">Terms of Service</Link> and <Link href="#" className="text-[#8c6d4e] hover:underline">Privacy Policy</Link>
                </label>
              </div>
              <Button type="submit" className="w-full mt-6 bg-[#8c6d4e] hover:bg-[#725a3f] text-white" disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-[#5a3e2b]">
              Already have an account? <Link href="/login" className="text-[#8c6d4e] font-semibold hover:underline">Sign in</Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
