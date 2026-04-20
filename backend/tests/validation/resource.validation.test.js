const request = require("supertest");
const { buildValidationApp } = require("../helpers/buildValidationApp");
const {
  postValidators,
  chatValidators,
  shareValidators,
  verificationValidators,
  analyticsValidators,
  notificationValidators,
} = require("../../validations/routeValidators");

describe("resource validators", () => {
  test("rejects post comment when post id is invalid", async () => {
    const app = buildValidationApp({
      method: "post",
      path: "/posts/:id/comments",
      validators: postValidators.addComment,
    });

    const response = await request(app)
      .post("/posts/not-an-id/comments")
      .send({ text: "Nice post" });

    expect(response.status).toBe(400);
  });

  test("accepts post comment with valid post id and text", async () => {
    const app = buildValidationApp({
      method: "post",
      path: "/posts/:id/comments",
      validators: postValidators.addComment,
    });

    const response = await request(app)
      .post("/posts/507f1f77bcf86cd799439011/comments")
      .send({ text: "Nice post" });

    expect(response.status).toBe(200);
  });

  test("rejects chat message when no text/media/shared content is provided", async () => {
    const app = buildValidationApp({
      method: "post",
      path: "/chat/:userId",
      validators: chatValidators.sendMessage,
    });

    const response = await request(app)
      .post("/chat/507f1f77bcf86cd799439011")
      .send({});

    expect(response.status).toBe(400);
  });

  test("accepts share post payload with valid recipientIds", async () => {
    const app = buildValidationApp({
      method: "post",
      path: "/share/posts/:postId",
      validators: shareValidators.sharePost,
    });

    const response = await request(app)
      .post("/share/posts/507f1f77bcf86cd799439011")
      .send({
        recipientIds: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
        message: "Check this out",
      });

    expect(response.status).toBe(200);
  });

  test("rejects verification token when format is invalid", async () => {
    const app = buildValidationApp({
      method: "post",
      path: "/verify-email/:token",
      validators: verificationValidators.verifyEmail,
    });

    const response = await request(app).post("/verify-email/invalid-token").send({});

    expect(response.status).toBe(400);
  });

  test("accepts analytics days query within allowed range", async () => {
    const app = buildValidationApp({
      method: "get",
      path: "/analytics/dashboard",
      validators: analyticsValidators.dashboard,
    });

    const response = await request(app).get("/analytics/dashboard?days=30");

    expect(response.status).toBe(200);
  });

  test("rejects analytics days query outside allowed range", async () => {
    const app = buildValidationApp({
      method: "get",
      path: "/analytics/dashboard",
      validators: analyticsValidators.dashboard,
    });

    const response = await request(app).get("/analytics/dashboard?days=120");

    expect(response.status).toBe(400);
  });

  test("rejects notifications query when skip is negative", async () => {
    const app = buildValidationApp({
      method: "get",
      path: "/notifications",
      validators: notificationValidators.list,
    });

    const response = await request(app).get("/notifications?skip=-1");

    expect(response.status).toBe(400);
  });
});
