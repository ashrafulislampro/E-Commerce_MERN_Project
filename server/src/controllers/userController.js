const createError = require("http-errors");
const User = require("../models/userModel");
const { successResponse } = require("./responseController");
const { findWithId } = require("../services/findItem");
const { deleteImage } = require("../helper/deleteImage");
const { createJSONWebToken } = require("../helper/jsonWebToken");
const { jwtActivationKey, clientURL } = require("../secret");
const emailWithNodeMailer = require("../helper/email");
const jwt = require("jsonwebtoken");
const fs = require("fs").promises;

const getUsers = async (req, res, next) => {
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

    if (!users) throw createError(404, "No users found");

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

const getUserById = async (req, res, next) => {
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

const deleteUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const options = { password: 0 };
    const user = await findWithId(User, id, options);

    console.log("user80 : ", user);
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

const processRegister = async (req, res, next) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const image = req.file;
    if(!image){
      throw createError(400, 'Image file is required.');
    }
    if(image.size > 2097152){
      throw createError(400, 'File too large. It must be less than 2 MB.');
    }


    const imageBufferString = image.buffer.toString('base64');


    const userExists = await User.exists({ email: email });
    if (userExists) {
      throw createError(
        409,
        "User with this email already exist. Please sign in."
      );
    }

    // create jwt
    const token = createJSONWebToken(
      { name, email, password, phone, address, image:imageBufferString },
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
    try {
      await emailWithNodeMailer(emailData);
    } catch (error) {
      next(createError(500, "Failed to send verification email"));
      return;
    }

    return successResponse(res, {
      statusCode: 200,
      message: `Please go to your ${email} for completing your registration process.`,
      payload: { token },
    });
  } catch (error) {
    next(error);
  }
};

const activateUserAccount = async (req, res, next) => {
  try {
    const token = req.body.token;
    if (!token) throw createError(404, "token not found");

    try {
      const decoded = jwt.verify(token, jwtActivationKey);
      if(!decoded) throw createError(401, 'Unable to verify user');

      const userExists = await User.exists({ email: decoded.email });
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
      if(error.name === 'TokenExpiredError'){
        throw createError(401, 'Token has expired');
      }else if(error.name === 'JsonWebTokenError'){
        throw createError(401, 'Invalid Token');
      }else{
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
};

const updateUserById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const options = {password: 0};
    await findWithId(User, id, options);
    const updatedOptions = { new: true, runValidators: true, context: 'query' };

     // name, password, phone, image, address
    let updates = {};
   
   

    for(let key in req.body){
      if(['name', 'password', 'phone', 'address', ].includes(key)){
        updates[key] = req.body[key];
      }else if(['email'].includes(key)){
        throw new Error('Email can not be updated');
      }
    }

    const image = req.file;
    if(image){
      if(image.size > 2097152){
        throw new Error('File too large. It must be less than 2 MB.');
      }
      updates.image = image.buffer.toString("base64");
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, updatedOptions).select("-password");

    if(!updatedUser) {
      throw createError(404, 'User with this ID does not exist.');
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
    const options = {password: 0};
    await findWithId(User, id, options);
    const updates = {isBanned: true};
    const updatedOptions = { new: true, runValidators: true, context: 'query' };

    
    const updatedUser = await User.findByIdAndUpdate(id, updates, updatedOptions).select("-password");

    if(!updatedUser) {
      throw createError(400, 'User was not banned successfully.');
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
    const options = {password: 0};
    await findWithId(User, id, options);
    const updates = {isBanned: false};
    const updatedOptions = { new: true, runValidators: true, context: 'query' };

    
    const updatedUser = await User.findByIdAndUpdate(id, updates, updatedOptions).select("-password");

    if(!updatedUser) {
      throw createError(400, 'User was not unbanned successfully.');
    }

    return successResponse(res, {
      statusCode: 200,
      message: "User was unbanned successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  deleteUserById,
  processRegister,
  activateUserAccount,
  updateUserById,
  handleBanUserById,
  handleUnbanUserById
};
