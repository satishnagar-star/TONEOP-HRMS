import Joi from "joi";
import { gasApi } from "../services/gasApiService.js";
import { signAccessToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { store } from "../services/dataStore.js";

const loginSchema = Joi.object({
  employeeCode: Joi.string().trim().min(2).max(32).required(),
  password: Joi.string().min(1).max(128).required(),
});

const changeSchema = Joi.object({
  employeeCode: Joi.string().trim().min(2).max(32),
  newPassword: Joi.string().min(4).max(128).required(),
});

export const authController = {
  login: asyncHandler(async (req, res) => {
    const { value, error } = loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ success: false, message: "Invalid input", details: error.details });
    }

    const result = await gasApi.login({ code: value.employeeCode, pass: value.password });

    if (!result?.success || !result?.user) {
      await store.appendLog({
        type: "auth.login_failed",
        at: new Date().toISOString(),
        employeeCode: value.employeeCode,
      });
      return res.status(200).json(result);
    }

    const claims = {
      code: result.user.code,
      name: result.user.name,
      department: result.user.department,
      role: result.user.role,
    };
    const token = signAccessToken(claims);

    await store.appendLog({
      type: "auth.login",
      at: new Date().toISOString(),
      employeeCode: claims.code,
      role: claims.role,
      department: claims.department,
    });

    return res.json({ success: true, token, user: result.user });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const { value, error } = changeSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ success: false, message: "Invalid input", details: error.details });
    }

    const requester = req.user;
    const targetCode = value.employeeCode ?? requester.code;
    const canChangeOther = requester.role === "SuperAdmin";

    if (!canChangeOther && targetCode !== requester.code) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const result = await gasApi.changePassword({ code: targetCode, newPass: value.newPassword });

    await store.appendLog({
      type: "auth.change_password",
      at: new Date().toISOString(),
      employeeCode: targetCode,
      by: requester.code,
    });

    return res.json(result);
  }),
};
