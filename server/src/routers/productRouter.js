const express = require("express");
const runValidation = require("../validators");
const { isLoggedIn, isLoggedOut, isAdmin } = require("../middlewares/auth");
const { handleCreateProduct,
    // handleGetCategories, handleGetCategory, handleUpdateCategory, handleDeleteCategory 
} = require("../controllers/categoryController");
const { validateCategory } = require("../validators/category");

const productRouter = express.Router(); 

productRouter.post("/", 
// validateCategory, runValidation, isLoggedIn, isAdmin,
 handleCreateProduct
); 

// productRouter.get("/", handleGetCategories);
// productRouter.get("/:slug", handleGetCategory);
// productRouter.put("/:slug",validateCategory, runValidation, isLoggedIn, isAdmin, handleUpdateCategory);

// productRouter.delete("/:slug", isLoggedIn, isAdmin, handleDeleteCategory);

module.exports = productRouter;
