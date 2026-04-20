const router = require("express").Router();
const { protect } = require("../middlewares/auth");
const { getDashboardAnalytics } = require("../controllers/analytics.controller");
const { validate } = require("../middlewares/validate");
const { analyticsValidators } = require("../validations/routeValidators");

router.get("/dashboard", protect, analyticsValidators.dashboard, validate, getDashboardAnalytics);

module.exports = router;
