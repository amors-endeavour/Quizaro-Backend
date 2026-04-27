const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  console.error("🔥 ERROR:", err);

  // 🔥 If request is from browser → render EJS
  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    return res.status(err.statusCode).render("error", {
      title: "Error",
      message: err.message,
      statusCode: err.statusCode
    });
  }

  // 🔥 Otherwise → JSON (for APIs/Postman)
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
};

module.exports = errorHandler;