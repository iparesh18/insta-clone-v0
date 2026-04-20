const express = require("express");
const { validate } = require("../../middlewares/validate");

const buildValidationApp = ({ method = "post", path = "/", validators = [] }) => {
  const app = express();
  app.use(express.json());

  app[method](path, validators, validate, (req, res) => {
    res.status(200).json({ success: true });
  });

  return app;
};

module.exports = { buildValidationApp };
