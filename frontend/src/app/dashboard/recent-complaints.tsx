// File: components/dashboard/recent-complaints.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function RecentComplaints() {
  // Sample data for recent complaints
  const recentComplaints = [
    {
      id: "COMP-2305",
      customer: "Jennifer Martinez",
      title: "Account access issue",
      message: "I'm unable to log into my account after the recent password reset.",
      status: "open",
      time: "2 hours ago",
      initials: "JM"
    },
    {
      id: "COMP-2304",
      customer: "David Wilson",
      title: "Technical support needed",
      message: "The application keeps crashing when I try to generate reports.",
      status: "in-progress",
      time: "5 hours ago",
      initials: "DW"
    },
    {
      id: "COMP-2303",
      customer: "Emily Davis",
      title: "Refund request",
      message: "I would like to request a refund for my last purchase due to product defect.",
      status: "pending",
      time: "1 day ago",
      initials: "ED"
    },
    {
      id: "COMP-2302",
      customer: "Michael Brown",
      title: "Product delivery delay",
      message: "My order was supposed to arrive yesterday but I haven't received it yet.",
      status: "in-progress",
      time: "2 days ago",
      initials: "MB"
    },
  ];

  return (
    <Card className="bg-white border-[#EED9C4]">
      <CardHeader>
        <CardTitle>Recent Complaints</CardTitle>
        <CardDescription>
          Latest customer issues that require attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentComplaints.map((complaint) => (
            <div 
              key={complaint.id}
              className="flex items-start space-x-4 p-3 rounded-lg hover:bg-[#f5eadf] transition-colors"
            >
              <Avatar className="h-10 w-10 bg-[#c9a382] text-white">
                <AvatarFallback>{complaint.initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{complaint.customer}</p>
                  <span className="text-xs text-muted-foreground">{complaint.time}</span>
                </div>
                <p className="text-sm font-medium text-[#8a6e53]">
                  {complaint.id}: {complaint.title}
                  </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {complaint.message}
                </p>
                <div className="flex items-center pt-1">
                  <div className="flex items-center space-x-2">
                    <Badge
                      className={`${
                        complaint.status === "open"
                          ? "bg-blue-100 text-blue-800"
                          : complaint.status === "in-progress"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-yellow-100 text-yellow-800"
                      } font-normal`}
                      variant="outline"
                    >
                      {complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1).replace('-', ' ')}
                    </Badge>
                    <Button variant="link" size="sm" className="h-6 p-0 text-[#8a6e53]">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}