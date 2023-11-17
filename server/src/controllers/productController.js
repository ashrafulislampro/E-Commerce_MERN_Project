const slugify = require("slugify");
const Product = require("../models/productModel");
const createError = require("http-errors");
const { successResponse } = require("./responseController");
const { createProduct, getProducts, getProduct, deleteProduct } = require("../services/productService");


const handleCreateProduct = async (req, res, next) => {
  try {
    const { name, description, price, quantity, shipping, category } = req.body;

    const image = req.file;

    if (!image) {
      throw createError(400, "Image file is required.");
    }
    if (image.size > 2097152) {
      throw createError(400, "File too large. It must be less than 2 MB.");
    }
    const imageBufferString = image.buffer.toString("base64");

    const productData = {name, description, price, quantity, shipping, category, imageBufferString};

   const product = await createProduct(productData);

    return successResponse(res, {
      statusCode: 201,
      message: "Product was created successfully.",
      payload: product
    });
  } catch (error) {
    next(error);
  }
};


const handleGetProducts = async (req, res, next) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4;

        const searchRegExp = new RegExp('.*' + search + '.*', 'i');

        const filter = {
          $or: [
            {name: {$regex: searchRegExp}},
            // {price: {$regex: searchRegExp}}          
          ]
        }
        
        const products = await Product.find(filter).populate('category').skip((page - 1) * limit).limit(limit).sort({createdAt: -1});

        // const products = await getProducts();
        if(!products){
            throw createError(404, "Products not found !");
        }

        const count = await Product.find(filter).countDocuments();

        return successResponse(res, {
            statusCode: 200,
            message: "Product was returned successfully.",
            payload: {
              products: products,
              pagination: {
                  total_page: Math.ceil(count / limit),
                  current_page: page,
                  prev_page: page - 1,
                  next_page: page + 1,
                  total_products: count,
              }
              
            }
          });
    } catch (error) {
        next(error);
    }
}

const handleGetProduct = async (req, res, next) =>{
  try {
      const {slug} = req.params;
      const product = await getProduct(slug);        
      if(!product){
          throw createError(404, "Product not found !");
      }

      return successResponse(res, {
          statusCode: 200,
          message: "Product fetch successfully.",
          payload: product
        });

  } catch (error) {
      next(error);
  }
}
const handleDeleteProduct = async (req, res, next) =>{
  try {
      const {slug} = req.params;
      const result = await deleteProduct(slug);        
      if(!result){
          throw createError(404, "Product delete failed with this slug !");
      }

      return successResponse(res, {
          statusCode: 200,
          message: "Product was deleted successfully."
        });

  } catch (error) {
      next(error);
  }
}

const handleUpdatedProduct = async (req, res, next) => {
  try {
    const {slug} = req.params;
    const updatedOptions = { new: true, runValidators: true, context: "query" };

    let updates = {};
    const allowedFields = ["name", "description", "price", "quantity", "shipping", "sold", "category"];

    for (const key in req.body) {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
        updates.slug = slugify(updates.name);
      } 
    }

    const image = req.file;
    if (image) {
      if (image.size > 2097152) {
        throw new Error("File too large. It must be less than 2 MB.");
      }
      updates.image = image.buffer.toString("base64");
    }

    const updatedProduct = await Product.findOneAndUpdate(
      {slug},
      updates,
      updatedOptions
    );

    if (!updatedProduct) {
      throw createError(404, "Product with this slug does not exist.");
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Product was updated successfully",
      payload: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
handleCreateProduct,
handleGetProducts,
handleGetProduct,
handleDeleteProduct,
handleUpdatedProduct
};
