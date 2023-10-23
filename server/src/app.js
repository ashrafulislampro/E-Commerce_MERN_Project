const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const createError = require("http-errors");
const xssClean = require("xss-clean");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const userRouter = require("./routers/userRouter");
const seedRouter = require("./routers/seedRouter");
const { errorResponse } = require("./controllers/responseController");
const authRouter = require("./routers/authRouter");
const categoryRouter = require("./routers/categoryRouter");
const app = express();

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 5,
  message: "Too many requests from this IP. Please try again later.",
});

app.use(apiLimiter);
app.use(xssClean());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/seed", seedRouter);
app.use("/api/categories", categoryRouter);

const isLoggedIn = (req, res, next) => {
  const isLogged = true;
  if (isLogged) {
    req.body.id = 101;
    next();
  } else {
    return res.status(401).send({
      message: "Please login first.",
    });
  }
};

// app.use(isLoggedIn);

app.get("/test", (req, res) => {
  res.status(200).send({
    message: "get: api testing working fine!!",
  });
});

// client error handling
app.use((req, res, next) => {
  next(createError(404, "Route not found."));
});

// server error handling -> all the errors
app.use((err, req, res, next) => {
  return errorResponse(res, {
    statusCode: err.status,
    message: err.message,
  });
});

module.exports = app;
