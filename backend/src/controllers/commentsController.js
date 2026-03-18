import Joi from "joi";
import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { store } from "../services/dataStore.js";
import { Ticket } from "../models/Ticket.js";

const createSchema = Joi.object({
  date: Joi.string().trim().min(3).max(32).required(),
  message: Joi.string().trim().min(3).max(1000).required(),
});

const replySchema = Joi.object({
  ticketId: Joi.string().trim().required(),
  reply: Joi.string().trim().min(1).max(1000).required(),
  status: Joi.string().valid("Open", "Resolved").default("Resolved"),
});

export const commentsController = {
  create: asyncHandler(async (req, res) => {
    const { value, error } = createSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) return res.status(400).json({ success: false, message: "Invalid input", details: error.details });

    const now = new Date().toISOString();
    const ticket = {
      ticketId: `TCK-${uuidv4().slice(0, 8).toUpperCase()}`,
      employeeCode: req.user.code,
      name: req.user.name,
      department: req.user.department,
      date: value.date,
      message: value.message,
      reply: "",
      status: "Open",
      createdAt: now,
      updatedAt: now,
    };

    await Ticket.create(ticket);

    await store.appendLog({
      type: "ticket.create",
      at: now,
      ticketId: ticket.ticketId,
      employeeCode: ticket.employeeCode,
    });

    return res.json({ success: true, ticket });
  }),

  my: asyncHandler(async (req, res) => {
    const tickets = await Ticket.find({ employeeCode: req.user.code }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, tickets });
  }),

  department: asyncHandler(async (req, res) => {
    const tickets = await Ticket.find({ department: req.user.department }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, tickets });
  }),

  all: asyncHandler(async (req, res) => {
    const tickets = await Ticket.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, tickets });
  }),

  reply: asyncHandler(async (req, res) => {
    const { value, error } = replySchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) return res.status(400).json({ success: false, message: "Invalid input", details: error.details });

    const ticket = await Ticket.findOne({ ticketId: value.ticketId });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    if (req.user.role === "Admin" && ticket.department !== req.user.department) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    ticket.reply = value.reply;
    ticket.status = value.status;
    ticket.updatedAt = new Date().toISOString();
    await ticket.save();

    await store.appendLog({
      type: "ticket.reply",
      at: new Date().toISOString(),
      ticketId: value.ticketId,
      by: req.user.code,
      status: value.status,
    });

    return res.json({ success: true, ticket });
  }),
};
