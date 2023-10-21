const createError = require("http-errors");
const User = require("../models/userModel");
const { successResponse } = require("./responseController");
const jwt = require("jsonwebtoken");
const { createJSONWebToken } = require("../helper/jsonWebToken");
const bcrypt = require("bcryptjs");
const { jwtAccessKey } = require("../secret");

const handleLogin = async (req, res, next) => {
  try {
    // email, password from req.body
    const { email, password } = req.body;

    // isExist
    const user = await User.findOne({ email });
    if (!user) {
      throw createError(
        404,
        "User does not exist with this email. Please register first."
      );
    }

    // compare the password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw createError(401, "Password did not match");
    }
    // isBanned
    if (user.isBanned) {
      throw createError(403, "You are Banned. Please contact authority");
    }

    // create jwt
    const accessToken = createJSONWebToken(
      {user},
      jwtAccessKey,
      "1m"
    );
    // token cookie
    res.cookie("accessToken", accessToken, {
      maxAge: 1 * 60 * 1000, // 15 minutes
      httpOnly: true,
      // secure: true,
      sameSite: "none",
    });

    // refresh token
    const refreshToken = createJSONWebToken(
        {user},
        jwtAccessKey,
        "7d"
      );
      // token cookie
      res.cookie("refreshToken", refreshToken, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        // secure: true,
        sameSite: "none",
      });

    const userWithoutPass = await User.findOne({ email }).select("-password");
    // success response
    return successResponse(res, {
      statusCode: 200,
      message: "User logged in successfully",
      payload: { userWithoutPass },
    });
  } catch (error) {
    next(error);
  }
};

const handleLogout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken");
    // success response
    return successResponse(res, {
      statusCode: 200,
      message: "User logged out successfully",
      payload: {},
    });
  } catch (error) {
    next(error);
  }
};

const handleRefreshToken = async (req, res, next) => {
    try {
      
      return successResponse(res, {
        statusCode: 200,
        message: "User logged out successfully",
        payload: {},
      });
    } catch (error) {
      next(error);
    }
  };

module.exports = { handleLogin, handleLogout, handleRefreshToken };
