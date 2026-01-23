"use client";

import { Code, Copy, Check, BookOpen, Key, Globe, FileText } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";

export default function ApiDocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({
    code,
    language,
    id,
  }: {
    code: string;
    language: string;
    id: string;
  }) => (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  const curlExample = `curl -X POST https://api.serviceflow.com/api/complaints/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here" \\
  -d '{
    "title": "Login not working",
    "description": "Customer cannot log in after password reset",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "externalReferenceId": "EXT-12345"
  }'`;

  const javascriptExample = `// Using fetch API
const response = await fetch('https://api.serviceflow.com/api/complaints/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    title: 'Login not working',
    description: 'Customer cannot log in after password reset',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    externalReferenceId: 'EXT-12345'
  })
});

const data = await response.json();
console.log(data);`;

  const pythonExample = `import requests

url = "https://api.serviceflow.com/api/complaints/create"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "your-api-key-here"
}
data = {
    "title": "Login not working",
    "description": "Customer cannot log in after password reset",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "externalReferenceId": "EXT-12345"
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`;

  const nodeExample = `const axios = require('axios');

const response = await axios.post(
  'https://api.serviceflow.com/api/complaints/create',
  {
    title: 'Login not working',
    description: 'Customer cannot log in after password reset',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    externalReferenceId: 'EXT-12345'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key-here'
    }
  }
);

console.log(response.data);`;

  const responseExample = `{
  "message": "Complaint created and assigned",
  "assignment": {
    "assignee_type": "EMPLOYEE",
    "employee_id": "e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1",
    "employee_email": "agent@example.com",
    "employee_title": "Support Engineer",
    "confidence": 0.92,
    "needs_review": false
  }
}`;

  return (
    <div className="flex-1 overflow-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-[#c9a382]" />
          <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
        </div>
        <p className="text-muted-foreground">
          Integrate ServiceFlow into your application with our RESTful API.
        </p>
      </div>

      {/* Quick Start */}
      <Card className="bg-white border-[#EED9C4] mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[#c9a382]" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Get started with the ServiceFlow API in minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Get Your API Key</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Navigate to{" "}
              <Link href="/dashboard/apikeys" className="text-[#8c6d4e] hover:underline">
                API Keys
              </Link>{" "}
              in your dashboard and generate a new API key. Choose your routing mode:
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">DEPARTMENT</Badge>
              <Badge variant="outline">EMPLOYEE</Badge>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">2. Authenticate Requests</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in the request header:
            </p>
            <CodeBlock
              code='X-API-Key: your-api-key-here'
              language="text"
              id="auth-header"
            />
          </div>
          <div>
            <h3 className="font-semibold mb-2">3. Make Your First Request</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Create a complaint using the endpoint below:
            </p>
            <CodeBlock code={curlExample} language="bash" id="quickstart-curl" />
          </div>
        </CardContent>
      </Card>

      {/* Base URL */}
      <Card className="bg-white border-[#EED9C4] mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#c9a382]" />
            Base URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code="https://api.serviceflow.com/api" language="text" id="base-url" />
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Note:</strong> Replace with your actual API base URL. For local development,
            use <code className="bg-gray-100 px-1 rounded">http://localhost:5000/api</code>
          </p>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card className="bg-white border-[#EED9C4] mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#c9a382]" />
            Endpoints
          </CardTitle>
          <CardDescription>Available API endpoints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create Complaint */}
          <div className="border-b pb-6">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-green-100 text-green-800">POST</Badge>
              <code className="text-sm font-mono">/complaints/create</code>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Create a new complaint. The system will automatically route it to the appropriate
              department or employee based on your API key's routing mode.
            </p>

            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Request Body</h4>
              <CodeBlock
                code={`{
  "title": "string (required)",
  "description": "string (optional)",
  "customerName": "string (required)",
  "customerEmail": "string (required)",
  "externalReferenceId": "string (optional)"
}`}
                language="json"
                id="request-body"
              />
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Response</h4>
              <CodeBlock code={responseExample} language="json" id="response-example" />
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Code Examples</h4>
              <Tabs defaultValue="curl" className="w-full">
                <TabsList className="bg-[#f5eadf]">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="node">Node.js</TabsTrigger>
                </TabsList>
                <TabsContent value="curl" className="mt-4">
                  <CodeBlock code={curlExample} language="bash" id="curl-example" />
                </TabsContent>
                <TabsContent value="javascript" className="mt-4">
                  <CodeBlock code={javascriptExample} language="javascript" id="js-example" />
                </TabsContent>
                <TabsContent value="python" className="mt-4">
                  <CodeBlock code={pythonExample} language="python" id="python-example" />
                </TabsContent>
                <TabsContent value="node" className="mt-4">
                  <CodeBlock code={nodeExample} language="javascript" id="node-example" />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card className="bg-white border-[#EED9C4] mb-6">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>How to authenticate your API requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              All API requests require authentication using an API key. Include your API key in the
              request header:
            </p>
            <CodeBlock
              code='X-API-Key: your-api-key-here'
              language="text"
              id="auth-example"
            />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Security Best Practices</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Never expose your API key in client-side code</li>
              <li>Store API keys securely using environment variables</li>
              <li>Rotate API keys regularly</li>
              <li>Use different API keys for different environments (dev, staging, production)</li>
              <li>Monitor API key usage in your dashboard</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Routing Modes */}
      <Card className="bg-white border-[#EED9C4] mb-6">
        <CardHeader>
          <CardTitle>Routing Modes</CardTitle>
          <CardDescription>How complaints are assigned</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">DEPARTMENT Mode</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Complaints are routed to departments based on ML classification. The system analyzes
              the complaint content and matches it to the most relevant department using keywords.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
              <p className="text-xs text-blue-800">
                <strong>Use case:</strong> When you want complaints to go to specific teams or
                departments first, then be distributed within that department.
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">EMPLOYEE Mode</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Complaints are directly routed to individual employees based on their expertise and
              keywords. The ML system matches complaints to the most suitable employee.
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mt-2">
              <p className="text-xs text-purple-800">
                <strong>Use case:</strong> When you want direct assignment to specific employees
                based on their skills and expertise.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Codes */}
      <Card className="bg-white border-[#EED9C4] mb-6">
        <CardHeader>
          <CardTitle>HTTP Status Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge className="bg-green-100 text-green-800">200</Badge>
              <div>
                <p className="font-semibold text-sm">OK</p>
                <p className="text-xs text-muted-foreground">Request successful</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-green-100 text-green-800">201</Badge>
              <div>
                <p className="font-semibold text-sm">Created</p>
                <p className="text-xs text-muted-foreground">Complaint created successfully</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-red-100 text-red-800">400</Badge>
              <div>
                <p className="font-semibold text-sm">Bad Request</p>
                <p className="text-xs text-muted-foreground">
                  Invalid request parameters or missing required fields
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-red-100 text-red-800">401</Badge>
              <div>
                <p className="font-semibold text-sm">Unauthorized</p>
                <p className="text-xs text-muted-foreground">
                  Invalid or missing API key
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-red-100 text-red-800">500</Badge>
              <div>
                <p className="font-semibold text-sm">Internal Server Error</p>
                <p className="text-xs text-muted-foreground">
                  Server error occurred. Please try again later.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you need assistance integrating with our API or have questions, please contact our
            support team or check your dashboard for additional resources.
          </p>
          <div className="flex gap-2">
            <Link href="/dashboard/apikeys">
              <Button variant="outline" className="bg-white">
                <Key className="h-4 w-4 mr-2" />
                View API Keys
              </Button>
            </Link>
            <Button variant="outline" className="bg-white">
              <FileText className="h-4 w-4 mr-2" />
              Download Postman Collection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

