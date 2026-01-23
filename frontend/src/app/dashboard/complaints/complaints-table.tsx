import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { MoreHorizontal, Edit, Trash2, RotateCcw } from "lucide-react";
  
  interface Complaint {
    id: string;
    title: string;
    customer_name: string;
    customer_email: string;
    description?: string;
    status: string;
    external_reference_id?: string;
    created_at: string;
    deleted_at?: string | null;
  }
  
  interface ComplaintsTableProps {
    complaints: Complaint[];
    onStatusUpdate?: (complaint: Complaint) => void;
    onDelete?: (complaint: Complaint) => void;
    onRestore?: (complaint: Complaint) => void;
  }
  
  export function ComplaintsTable({ complaints, onStatusUpdate, onDelete, onRestore }: ComplaintsTableProps) {
  
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      open: {
        label: "Open",
        className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      },
      in_progress: {
        label: "In Progress",
        className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
      },
      resolved: {
        label: "Resolved",
        className: "bg-green-100 text-green-800 hover:bg-green-100",
      },
    };
    
    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
    
    return (
      <Badge className={`${config.className} font-normal`} variant="outline">
        {config.label}
      </Badge>
    );
  };
    
  
    const formatDate = (dateString: string) => {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(dateString));
    };
  
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left w-[7ch]">ID</TableHead>
              <TableHead className="text-left">Customer</TableHead>
              <TableHead className="hidden md:table-cell text-left w-[250px]">Title</TableHead>
              <TableHead className="text-left">Status</TableHead>
              <TableHead className="hidden md:table-cell text-left">External Ref</TableHead>
              <TableHead className="hidden lg:table-cell text-left">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No complaints found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              complaints.map((complaint) => (
                <TableRow
                  key={complaint.id}
                  className="hover:bg-gray-50"
                >
                  <TableCell className="font-medium truncate">{String(complaint.id).substring(0, 7)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{complaint.customer_name}</div>
                      <div className="text-xs text-gray-500">{complaint.customer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[250px] whitespace-nowrap overflow-hidden">
                    <div className="flex flex-col space-y-1">
                      <h2 className="text-sm font-semibold text-gray-900 truncate">{complaint.title}</h2>
                      {complaint.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{complaint.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {complaint.external_reference_id || "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {formatDate(complaint.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onStatusUpdate && !complaint.deleted_at && (
                          <DropdownMenuItem onClick={() => onStatusUpdate(complaint)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Update Status
                          </DropdownMenuItem>
                        )}
                        {onDelete && !complaint.deleted_at && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => onDelete(complaint)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                        {onRestore && complaint.deleted_at && (
                          <DropdownMenuItem
                            className="text-green-600"
                            onClick={() => onRestore(complaint)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  }
  