const mongoose = require("mongoose");

function buildSourceFingerprint(sourceType, sourceLocation) {
  return `${sourceType}:${sourceLocation}`.trim().toLowerCase();
}

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    sourceType: {
      type: String,
      enum: ["github", "zip"],
      required: true
    },
    sourceLocation: {
      type: String,
      required: true
    },
    sourceFingerprint: {
      type: String,
      required: true,
      index: true
    },
    architectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Architecture",
      index: true
    },
    analysisReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AnalysisReport",
      index: true
    },
    lastAnalyzedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    metadata: {
      totalFiles: {
        type: Number,
        default: 0
      },
      totalDirectories: {
        type: Number,
        default: 0
      },
      detectedLanguage: {
        type: String,
        default: "Unknown"
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

projectSchema.index({ sourceType: 1, createdAt: -1 });
projectSchema.index({ sourceType: 1, sourceFingerprint: 1 });
projectSchema.index({ lastAnalyzedAt: -1 });

projectSchema.virtual("architecture", {
  ref: "Architecture",
  localField: "_id",
  foreignField: "projectId",
  justOne: true
});

projectSchema.virtual("analysisReport", {
  ref: "AnalysisReport",
  localField: "_id",
  foreignField: "projectId",
  justOne: true
});

projectSchema.pre("validate", function setDerivedProjectFields(next) {
  if (this.sourceType && this.sourceLocation) {
    this.sourceFingerprint = buildSourceFingerprint(this.sourceType, this.sourceLocation);
  }

  next();
});

module.exports = mongoose.model("Project", projectSchema);
