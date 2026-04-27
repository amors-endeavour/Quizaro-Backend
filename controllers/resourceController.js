const Resource = require("../models/resource");

// GET all resources
exports.getResources = async (req, res) => {
  try {
    const query = req.user?.role === 'admin' ? {} : { isFree: true };
    const resources = await Resource.find(query).sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST add resource (Admin Only)
exports.addResource = async (req, res) => {
  try {
    const { title, description, fileType, fileUrl, category, isFree, testId } = req.body;
    
    if (!title || !fileUrl) {
      return res.status(400).json({ message: "Title and File URL are required." });
    }

    const resource = new Resource({
      title,
      description,
      fileType,
      fileUrl,
      category,
      isFree,
      uploadedBy: req.user._id,
      testId: testId && testId !== "" ? testId : null
    });

    await resource.save();
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE resource (Admin Only)
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
