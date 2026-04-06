/**
 * utils/apiResponse.js
 * Standardised JSON response helpers.
 */

const sendSuccess = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res, message = "Something went wrong", statusCode = 500) => {
  return res.status(statusCode).json({ success: false, message });
};

/**
 * Cursor-based pagination metadata helper.
 * @param {Array}  items       - Result documents
 * @param {number} limit       - Page size
 * @param {string} cursorField - Field used as cursor (usually "_id")
 */
const paginatedResponse = (res, items, limit, cursorField = "_id") => {
  const hasMore = items.length === limit;
  const nextCursor = hasMore ? items[items.length - 1][cursorField] : null;
  return res.status(200).json({
    success: true,
    data: items,
    pagination: { hasMore, nextCursor },
  });
};

module.exports = { sendSuccess, sendError, paginatedResponse };
