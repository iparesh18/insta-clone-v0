const request = require("supertest");
const express = require("express");
const { body } = require("express-validator");
const { validate } = require("../../middlewares/validate");

describe("validate middleware", () => {
  test("returns 400 with structured errors when validation fails", async () => {
    const app = express();
    app.use(express.json());
    app.post(
      "/validate",
      body("email").isEmail().withMessage("valid email is required"),
      validate,
      (_req, res) => res.status(200).json({ success: true })
    );

    const response = await request(app).post("/validate").send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Validation failed");
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors[0].field).toBe("email");
  });

  test("calls next middleware when validation succeeds", async () => {
    const app = express();
    app.use(express.json());
    app.post(
      "/validate",
      body("email").isEmail(),
      validate,
      (_req, res) => res.status(200).json({ success: true })
    );

    const response = await request(app).post("/validate").send({ email: "user@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
