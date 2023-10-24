const slugify = require("slugify");
const Category = require("../models/categoryModel");
const Product = require("../models/productModel");

const createProduct = async (productData) => {

    const {name, description, price, quantity, shipping, category, imageBufferString} = productData;

    const productExists = await Product.exists({name: name});
    if (productExists) {
      throw createError(
        409,
        "Product with this name already exist !"
      );
    }
    const product = await Product.create({
        name: name, 
        slug: slugify(name),
        description: description,
        price: price,
        quantity: quantity,
        shipping: shipping,
        image: imageBufferString, 
        category: category
    });

  
  return product;
};
// .select('name slug description price quantity image sold shipping')
const getProducts = async () => {
  return await Product.find({}).lean();
};

const getProduct = async (slug) => {
  return await Product.findOne({slug}).populate("category");
};

const updateCategory = async (slug, name) => {
  const category = await Category.findOneAndUpdate(
    {slug},
    {$set: {name: name, slug: slugify(name)}},
    {new: true}
    )
    return category;

};
const deleteProduct = async (slug) => {
  const result = await Product.findOneAndDelete({slug});
  return result;

};


module.exports = { createProduct, getProducts, getProduct, updateCategory, deleteProduct };
