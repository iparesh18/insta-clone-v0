const request = require("supertest");
const { buildValidationApp } = require("../helpers/buildValidationApp");
const { authValidators } = require("../../validations/routeValidators");

describe("authValidators", () => {
  test("rejects register payload with invalid email", async () => {
    const app = buildValidationApp({
      method: "post",
      path: "/register",
      validators: authValidators.register,
    });

    const response = await request(app).post("/register").send({
      username: "valid_user",
      email: "invalid",
      password: "password123",
      fullName: "Test User",
    });

    expect(response.status).toBe(400);
  });

  test("rejects register payload with short password", async () => {
    const app = buildValidationApp({
      method: "post",
      path: "/register",
      validators: authValidators.register,
    });

    const response = await request(app).post("/register").send({
      username: "valid_user",
      email: "user@example.com",
      password: "123",
      fullName: "Test User",
    });

    expect(response.status).toBe(400);
  });

  test("accepts valid register payload", async () => {
    const app = buildValidationApp({
      method: "post",
      path: "/register",
      validators: authValidators.register,
    });

    const response = await request(app).post("/register").send({
      username: "valid_user",
      email: "user@example.com",
      password: "password123",
      fullName: "Test User",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("rejects login payload when password is missing", async () => {
    const app = buildValidationApp({
      method: "post",
      path: "/login",
      validators: authValidators.login,
    });

    const response = await request(app).post("/login").send({
      email: "user@example.com",
    });

    expect(response.status).toBe(400);
  });
});
