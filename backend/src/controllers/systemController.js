import { asyncHandler } from "../utils/asyncHandler.js";
import { store } from "../services/dataStore.js";

export const systemController = {
  logs: asyncHandler(async (req, res) => {
    const logs = await store.getLogs();
    return res.json({ success: true, logs });
  }),
};

