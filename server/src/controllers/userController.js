const createError = require("http-errors");
const User = require("../models/userModel");
const { successResponse } = require("./responseController");
const bcrypt = require("bcryptjs");
const { findWithId } = require("../services/findItem");
const { deleteImage } = require("../helper/deleteImage");
const { createJSONWebToken } = require("../helper/jsonWebToken");
const {
  jwtActivationKey,
  clientURL,
  jwtResetPasswordKey,
} = require("../secret");
const emailWithNodeMailer = require("../helper/email");
const jwt = require("jsonwebtoken");
const checkUserExists = require("../helper/checkUserExists");
const sendEmail = require("../helper/sendEmail");
const fs = require("fs").promises;

const handleGetUsers = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;

    const searchRegExp = new RegExp(".*" + search + ".*", "i");

    const filter = {
      isAdmin: { $ne: true },
      $or: [
        { name: { $regex: searchRegExp } },
        { email: { $regex: searchRegExp } },
        { phone: { $regex: searchRegExp } },
      ],
    };

    const options = { password: 0 };

    const users = await User.find(filter, options)
      .limit(limit)
      .skip((page - 1) * limit);

    const count = await User.find(filter).countDocuments();

    if (!users || users.length === 0) throw createError(404, "No users found");

    return successResponse(res, {
      statusCode: 200,
      message: "Users return successfully",
      payload: {
        users,
        pagination: {
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          previousPage: page - 1 > 0 ? page - 1 : null,
          nextPage: page + 1 <= Math.ceil(count / limit) ? page + 1 : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const handleGetUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const options = { password: 0 };
    const user = await findWithId(User, id, options);

    return successResponse(res, {
      statusCode: 200,
      message: "User was returned successfully",
      payload: { user },
    });
  } catch (error) {
    next(error);
  }
};

const handleDeleteUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const options = { password: 0 };
    await findWithId(User, id, options);
    
    // Local server থেকে image delete করার জন্য এই path ব্যবহার করতে হয়
    // const userImagePath = user.image;
    // deleteImage(userImagePath);

    await User.findByIdAndDelete({
      _id: id,
      isAdmin: false,
    });

    return successResponse(res, {
      statusCode: 200,
      message: "User was deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const handleProcessRegister = async (req, res, next) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const image = req.file;
    if (!image) {
      throw createError(400, "Image file is required.");
    }
    if (image.size > 2097152) {
      throw createError(400, "File too large. It must be less than 2 MB.");
    }

    const imageBufferString = image.buffer.toString("base64");

    const userExists = await checkUserExists(email);
    if (userExists) {
      throw createError(
        409,
        "User with this email already exist. Please sign in."
      );
    }

    // create jwt
    const token = createJSONWebToken(
      { name, email, password, phone, address, image: imageBufferString },
      jwtActivationKey,
      "10m"
    );

    // prepare email
    const emailData = {
      email,
      subject: "Account Activation Email",
      html: `<h2>Hello ${name} !</h2>
        <p>Please click here to<a href="${clientURL}/api/users/activate/${token}" target="_blank">activate your account</a></p>
        `,
    };

    // send email with nodemailer
    sendEmail(emailData);

    return successResponse(res, {
      statusCode: 200,
      message: `Please go to your ${email} for completing your registration process.`
      
    });
  } catch (error) {
    next(error);
  }
};

const handleActivateUserAccount = async (req, res, next) => {
  try {
    const token = req.body.token;
    if (!token) throw createError(404, "token not found");

    try {
      const decoded = jwt.verify(token, jwtActivationKey);
      if (!decoded) throw createError(401, "Unable to verify user");
      
      const userExists = await checkUserExists(decoded.email);
      if (userExists) {
        throw createError(
          409,
          "User with this email already exist. Please sign in."
        );
      }
      await User.create(decoded);

      return successResponse(res, {
        statusCode: 201,
        message: `User was registered successfully.`,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw createError(401, "Token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw createError(401, "Invalid Token");
      } else {
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
};

const handleUpdateUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const options = { password: 0 };
    await findWithId(User, id, options);
    const updatedOptions = { new: true, runValidators: true, context: "query" };

    // name, password, phone, image, address
    let updates = {};
    const allowedFields = ["name", "password", "phone", "address"];
    for (const key in req.body) {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      } else if ( key === "email") {
        throw createError(400, "Email can not be updated");
      }
    }

    const image = req.file;
    if (image) {
      if (image.size > 2097152) {
        throw new Error("File too large. It must be less than 2 MB.");
      }
      updates.image = image.buffer.toString("base64");
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updates,
      updatedOptions
    ).select("-password");

    if (!updatedUser) {
      throw createError(404, "User with this ID does not exist.");
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User was updated successfully",
      payload: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const handleBanUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const options = { password: 0 };
    await findWithId(User, id, options);
    const updates = { isBanned: true };
    const updatedOptions = { new: true, runValidators: true, context: "query" };

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updates,
      updatedOptions
    ).select("-password");

    if (!updatedUser) {
      throw createError(400, "User was not banned successfully.");
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User was banned successfully",
    });
  } catch (error) {
    next(error);
  }
};

const handleUnbanUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const options = { password: 0 };
    await findWithId(User, id, options);
    const updates = { isBanned: false };
    const updatedOptions = { new: true, runValidators: true, context: "query" };

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updates,
      updatedOptions
    ).select("-password");

    if (!updatedUser) {
      throw createError(400, "User was not unbanned successfully.");
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User was unbanned successfully",
    });
  } catch (error) {
    next(error);
  }
};

const handleUpdatePassword = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { oldPassword, newPassword } = req.body;

    const user = await findWithId(User, userId);

    // compare the password
    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordMatch) {
      throw createError(401, "Old Password is not correct");
    }

    // const filter = {userId};
    // const updates = {$set: {password: newPassword}};
    // const updatedOptions = {new: true};

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: newPassword },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      throw createError(
        400,
        "User password has not been updated successfully."
      );
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User password has been updated successfully.",
      payload: { updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

const handleForgetPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const userData = await User.findOne({ email: email });
    if (!userData) {
      throw createError(
        404,
        "Email is incorrect or you have not verified your email address. Please register yourself first."
      );
    }

    // create jwt
    const token = createJSONWebToken({ email }, jwtResetPasswordKey, "10m");

    // prepare email
    const emailData = {
      email,
      subject: "Reset Password Email",
      html: `<h2>Hello ${userData.name} !</h2>
    <p>Please click here to <a href="${clientURL}/api/users/reset_password/${token}" target="_blank">Reset your password</a></p>
    `,
    };

    // send email with nodemailer
    sendEmail(emailData);

    return successResponse(res, {
      statusCode: 200,
      message: `Please go to your ${email} to reset the password.`,
      payload: {token},
    });
  } catch (error) {
    next(error);
  }
};

const handleResetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const decoded = jwt.verify(token, jwtResetPasswordKey);
    
    if (!decoded) {
      throw createError(400, "Invalid or expired token");
    }

    const filter = { email: decoded.email };
    const updates = { password: password };
    const options = { new: true };

    const updatedUser = await User.findOneAndUpdate(
      filter,
      updates,
      options
    ).select("-password");

    if (!updatedUser) {
      throw createError(400, "Password reset failed");
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Password reset successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleGetUsers,
  handleGetUserById,
  handleDeleteUserById,
  handleProcessRegister,
  handleActivateUserAccount,
  handleUpdateUserById,
  handleBanUserById,
  handleUnbanUserById,
  handleUpdatePassword,
  handleForgetPassword,
  handleResetPassword,
};
