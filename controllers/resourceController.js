const Resource = require("../models/resource");
const { uploadToCloudinary } = require("../config/cloudinary");

// GET all PDF resources
exports.getResources = async (req, res) => {
  try {
    const resources = await Resource.find({}).sort({ createdAt: -1 });
    const mapped = resources.map(r => ({
      id: r._id,
      title: r.title,
      description: r.description || "",
      tags: r.tags || [],
      fileUrl: r.fileUrl,
      fileSize: r.fileSize || "0",
      uploadedAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
      category: r.category || "Question Paper"
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST add PDF resource with upload
exports.addPDFResource = async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required." });
    }

    // Upload to Cloudinary
    const fileUrl = await uploadToCloudinary(req.file.path, "quizaro");
    if (!fileUrl) {
      return res.status(500).json({ message: "Failed to upload file to storage." });
    }

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(",").map(t => t.trim());
      }
    }

    const resource = new Resource({
      title,
      description: description || "",
      fileType: "pdf",
      fileUrl,
      fileSize: req.file.size ? req.file.size.toString() : "0",
      tags: parsedTags,
      category: category || "Question Paper",
      uploadedBy: req.user ? req.user.id : null
    });

    await resource.save();

    const mapped = {
      id: resource._id,
      title: resource.title,
      description: resource.description,
      tags: resource.tags,
      fileUrl: resource.fileUrl,
      fileSize: resource.fileSize,
      uploadedAt: resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : "",
      category: resource.category
    };

    res.status(201).json(mapped);
  } catch (err) {
    console.error("addPDFResource error:", err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH edit PDF resource
exports.updatePDFResource = async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }

    if (title) resource.title = title;
    if (description !== undefined) resource.description = description;
    if (category) resource.category = category;

    if (tags) {
      try {
        resource.tags = JSON.parse(tags);
      } catch (e) {
        resource.tags = tags.split(",").map(t => t.trim());
      }
    }

    if (req.file) {
      const fileUrl = await uploadToCloudinary(req.file.path, "quizaro");
      if (fileUrl) {
        resource.fileUrl = fileUrl;
        resource.fileSize = req.file.size ? req.file.size.toString() : "0";
      }
    }

    await resource.save();

    const mapped = {
      id: resource._id,
      title: resource.title,
      description: resource.description,
      tags: resource.tags,
      fileUrl: resource.fileUrl,
      fileSize: resource.fileSize,
      uploadedAt: resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : "",
      category: resource.category
    };

    res.json(mapped);
  } catch (err) {
    console.error("updatePDFResource error:", err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE resource
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: "Resource deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
