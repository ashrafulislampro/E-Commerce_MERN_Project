const slugify = require("slugify");
const Category = require("../models/categoryModel");

const createCategory = async (name) => {
  const newCateogory = await Category.create({
    name: name,
    slug: slugify(name),
  });

  return newCateogory;
};

const getCategories = async () => {
  return await Category.find({}).select('name slug').lean();
};

const getCategory = async (slug) => {
  return await Category.find({slug}).select('name slug').lean();
};

const updateCategory = async (slug, name) => {
  const category = await Category.findOneAndUpdate(
    {slug},
    {$set: {name: name, slug: slugify(name)}},
    {new: true}
    )
    return category;

};
const deleteCategory = async (slug) => {
  const result = await Category.findOneAndDelete({slug});
  return result;

};

module.exports = { createCategory, getCategories, getCategory, updateCategory, deleteCategory };
