const { body } = require("express-validator");

const validateProduct = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product Name is required.")
    .isLength({ min: 3, max: 150 })
    .withMessage("Product Name should be at least 3-150 characters long"),

    body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required.")
    .isLength({ min: 3 })
    .withMessage("Description should be at least 3 characters long"),

    body("price")
    .trim()
    .notEmpty()
    .withMessage("Price is required.")
    .isFloat({min: 0})
    .withMessage("Price must be a positive number"),

    body("quantity")
    .trim()
    .notEmpty()
    .withMessage("Quantity is required.")
    .isFloat({min: 1})
    .withMessage("Quantity must be a positive number"),

    body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required.")
];

module.exports = { validateProduct };
