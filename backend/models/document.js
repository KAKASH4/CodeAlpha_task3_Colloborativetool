const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  userId: { type: String, required: true }, // ID of the user who made the change
});

const DocumentSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Explicitly define `_id` as a string
  content: { type: String, required: true },
  versions: [versionSchema],
  lastModified: { type: Date, default: Date.now },
});

const Document = mongoose.model('Document', DocumentSchema);
module.exports = Document;
