import { Request, Response } from "express";
import { db } from "../config/db";
import { config } from "../config/config";
import { Prisma } from "../generated/prisma";

export const getAllActiveEmployees = async (req: Request, res: Response) => {

    console.log("All Active Employees");

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    try {
        const employees = await db.employee.findMany({
            where: { tenantId, deletedAt: null },
            include: { user: true }
        });

        const formatted = employees.map((e) => ({
            id: e.id,
            tenant_id: e.tenantId,
            user_id: e.userId,
            department_id: e.departmentId,
            load: e.load,
            name: (e.name && e.name.trim() !== '') ? e.name : e.user.name,
            title: e.title,
            keywords: e.keywords,
            vector: e.vector,
            created_at: e.createdAt,
            deleted_at: e.deletedAt
        }));

        res.status(200).json(formatted);
    } catch (err) {
        return res.status(500).json({ message: "Internal server error" });
    }

}

export const getAllDeletedEmployees = async (req: Request, res: Response) => {

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    try {
        const employees = await db.employee.findMany({
            where: { tenantId, deletedAt: { not: null } },
            include: { user: true }
        });

        const formatted = employees.map((e) => ({
            id: e.id,
            tenant_id: e.tenantId,
            user_id: e.userId,
            department_id: e.departmentId,
            load: e.load,
            name: (e.name && e.name.trim() !== '') ? e.name : e.user.name,
            title: e.title,
            keywords: e.keywords,
            vector: e.vector,
            created_at: e.createdAt,
            deleted_at: e.deletedAt
        }));

        res.status(200).json(formatted);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }

}

export const deleteEmployee = async (req: Request, res: Response) => {

    const { employeeId } = req.body as { tenantId: string, employeeId: string };

    const tenantId = req.user?.tenantId;

    if (!employeeId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }
    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    try {
        await db.employee.updateMany({
            where: { id: employeeId, tenantId },
            data: { deletedAt: new Date() }
        });
        res.status(200).json({ message: "Employee deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }

}

export const restoreEmployee = async (req: Request, res: Response) => {

    const { employeeId } = req.body as { tenantId: string, employeeId: string };

    const tenantId = req.user?.tenantId;

    if (!employeeId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    try {
        await db.employee.updateMany({
            where: { id: employeeId, tenantId },
            data: { deletedAt: null }
        });
        res.status(200).json({ message: "Employee restored successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }

}

export const mapEmployeeToDepartment = async (req: Request, res: Response) => {

    const { employeeId, departmentId } = req.body as { tenantId: string, employeeId: string, departmentId: string };

    if (!employeeId || !departmentId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    try {
        await db.employee.updateMany({
            where: { id: employeeId, tenantId, deletedAt: null },
            data: { departmentId }
        });
        res.status(200).json({ message: "Employee mapped to department successfully" });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const createEmployeeVectors = async (req: Request, res: Response) => {

    const { keywords, employeeId } = req.body as { keywords: string, employeeId: string };

    if (!employeeId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    if (!keywords) {
        res.status(400).json({ message: "At least one keyword is required" });
        return;
    }

    // ✅ Clean keywords string and convert to array
    const keywordArray = keywords
        .replace(/[^\w\s]/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    console.log("Processed keywords:", keywordArray);

    try {

        const response = await fetch(`${config.ML_SERVICE_URL}/profile/vectorize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                profile_keywords: keywordArray
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
            let errorMessage = "Department vectorization failed, Try again later";

            if (Array.isArray(errorData)) {
                errorMessage = errorData
                    .map(
                        (err: any) =>
                            `${err.loc?.join(".")}: ${err.msg} (input: ${JSON.stringify(err.input)})`
                    )
                    .join("; ");
            } else if (errorData.detail) {
                errorMessage = errorData.detail;
            } else if (errorData.message) {
                errorMessage = errorData.message;
            }

            console.error("Classifier error:", JSON.stringify(errorData, null, 2), "Status:", response.status);
            throw new Error(`Employee vectorization failed, Try again later: ${errorMessage}`);
        }

        const vectorData = await response.json();
        const vector = vectorData.vectors;

        if (!vector) {
            throw new Error("Vector not returned by ML service");
        }


        // 3 update employee
        const employeeResult = await db.employee.update({
            where: { id: employeeId },
            data: { vector: vector as unknown as Prisma.InputJsonValue, keywords: keywordArray },
            select: { id: true, name: true }
        });

        res.status(200).json({
            message: "Employee vector updated successfully",
            employee: {
                id: employeeResult.id,
                name: employeeResult.name,
                keywords: keywordArray,
            },
            vector_dimension: vectorData.vector_dimension,
        });

    }
    catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const updateEmployeeName = async (req: Request, res: Response) => {

    const { employeeId, name } = req.body as { tenantId: string, employeeId: string, name: string };

    if (!employeeId || !name) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    try {
        const updated = await db.$transaction(async (tx) => {
            const emp = await tx.employee.update({
                where: { id: employeeId },
                data: { name },
                select: { id: true, name: true, userId: true }
            });

            await tx.user.update({
                where: { id: emp.userId },
                data: { name }
            });

            return emp;
        });

        res.status(200).json({
            id: updated.id,
            name: updated.name,
            message: "Employee name updated successfully"
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export const getMyAssignments = async (req: Request, res: Response) => {

    const { employeeId } = req.params as { employeeId: string };

    if (!employeeId) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const tenantId = req.user?.tenantId;

    if (!tenantId) {
        res.status(400).json({ message: "Unauthorized" });
        return;
    }

    try {
        const assignments = await db.assignment.findMany({
            where: {
                employeeId,
                complaint: { deletedAt: null }
            },
            include: { complaint: true },
            orderBy: { assignedAt: 'desc' }
        });

        const formatted = assignments.map((a) => ({
            id: a.id,
            complaint_id: a.complaintId,
            assignee_type: a.assigneeType,
            assigned_at: a.assignedAt,
            title: a.complaint.title,
            description: a.complaint.description,
            customer_name: a.complaint.customerName,
            customer_email: a.complaint.customerEmail,
            status: a.complaint.status,
            external_reference_id: a.complaint.externalReferenceId,
            created_at: a.complaint.createdAt,
            updated_at: a.complaint.updatedAt
        }));

        res.status(200).json(formatted);

    }
    catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }

}