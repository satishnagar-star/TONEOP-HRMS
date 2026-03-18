import { Ticket } from "../models/Ticket.js";
import { SystemLog } from "../models/SystemLog.js";
import { User } from "../models/User.js";

export const store = {
  // ──── Tickets ────────────────────────────────────────────────────────────────
  async getTickets() {
    return Ticket.find().sort({ createdAt: -1 }).lean();
  },

  async saveTickets(tickets) {
    // Used by commentsController to update a single ticket in place.
    // We upsert each ticket by ticketId.
    for (const t of tickets) {
      await Ticket.findOneAndUpdate(
        { ticketId: t.ticketId },
        { $set: t },
        { upsert: true }
      );
    }
  },

  // ──── Employees (Users) ──────────────────────────────────────────────────────
  async getEmployees() {
    const users = await User.find().lean();
    return users.map((u) => ({
      code: u.emp_code,
      name: u.name,
      department: u.department,
      role: u.role,
    }));
  },

  async saveEmployees(employees) {
    // Called by employeeController.create (push) and employeeController.remove (filter).
    // We do a full diff — but simpler: caller manages create/delete individually.
    // Sync all by upserting present and removing absent.
    const codes = employees.map((e) => e.code.toUpperCase());
    // Remove employees not in the new list
    await User.deleteMany({ emp_code: { $nin: codes } });
    // Upsert present ones
    for (const e of employees) {
      await User.findOneAndUpdate(
        { emp_code: e.code.toUpperCase() },
        {
          $set: {
            emp_code: e.code.toUpperCase(),
            name: e.name,
            department: e.department,
            role: e.role,
          },
          $setOnInsert: { password: e.code.toLowerCase() },
        },
        { upsert: true }
      );
    }
  },

  // ──── System Logs ────────────────────────────────────────────────────────────
  async getLogs() {
    return SystemLog.find().sort({ _id: -1 }).limit(5000).lean();
  },

  async appendLog(entry) {
    return SystemLog.create(entry);
  },
};
