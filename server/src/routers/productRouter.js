const express = require("express");
const runValidation = require("../validators");
const { isLoggedIn, isLoggedOut, isAdmin } = require("../middlewares/auth");
const { handleCreateProduct, handleGetProducts, handleGetProduct, handleDeleteProduct, handleUpdatedProduct } = require("../controllers/productController");
const upload = require("../middlewares/uploadFile");
const { validateProduct } = require("../validators/product");

const productRouter = express.Router(); 

// POST -> /api/products -> create a product
productRouter.post("/", upload.single("image"), validateProduct, runValidation, isLoggedIn, isAdmin, handleCreateProduct); 

// GET -> /api/products -> get all products
productRouter.get("/", handleGetProducts); 

// GET -> /api/products -> get single product
productRouter.get("/:slug", handleGetProduct); 

// DELETE -> /api/products -> delete single product
productRouter.delete("/:slug", isLoggedIn, isAdmin, handleDeleteProduct); 

// PUT -> /api/products -> updated single product
productRouter.put("/:slug", upload.single("image"), isLoggedIn, isAdmin, handleUpdatedProduct); 

module.exports = productRouter;
