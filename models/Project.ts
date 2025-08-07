// filepath: app/models/Project.ts
import mongoose, { Schema } from 'mongoose';

const ProjectSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: false,
    trim: true,
    index: true // Add index for faster lookups
  },
  trackingCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: function() {
      // Generate a unique tracking code if not provided
      return 'site_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
  },
  publicMode: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Extract domain from URL when saving
ProjectSchema.pre('save', function(next) {
  if (this.url && !this.domain) {
    try {
      // Extract domain from URL (remove protocol and www)
      const url = this.url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
      this.domain = url.split('/')[0]; // Get domain part
    } catch (error) {
      console.error("Error extracting domain:", error);
    }
  }
  next();
});

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);