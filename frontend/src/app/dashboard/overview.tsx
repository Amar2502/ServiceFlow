// File: components/dashboard/overview.tsx
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } from "recharts";
  
  export function Overview() {
    // Sample data for the chart
    const data = [
      { name: "Jan", complaints: 150 },
      { name: "Feb", complaints: 180 },
      { name: "Mar", complaints: 140 },
      { name: "Apr", complaints: 200 },
      { name: "May", complaints: 180 },
      { name: "Jun", complaints: 220 },
      { name: "Jul", complaints: 240 },
      { name: "Aug", complaints: 260 },
      { name: "Sep", complaints: 230 },
      { name: "Oct", complaints: 190 },
      { name: "Nov", complaints: 210 },
      { name: "Dec", complaints: 170 },
    ];
  
    return (
      <Card className="bg-white border-[#EED9C4]">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            Monthly complaint volume and resolution trends
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="complaints"
                  stroke="#e17055"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }
  