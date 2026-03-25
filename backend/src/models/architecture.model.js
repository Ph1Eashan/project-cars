const mongoose = require("mongoose");

const architectureNodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    file: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const apiSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    path: {
      type: String,
      required: true,
      trim: true
    },
    file: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const dependencySchema = new mongoose.Schema(
  {
    from: {
      type: String,
      required: true,
      trim: true
    },
    to: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const databaseInteractionSchema = new mongoose.Schema(
  {
    file: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const fileTreeNodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["file", "directory"],
      required: true
    },
    children: {
      type: [mongoose.Schema.Types.Mixed],
      default: undefined
    }
  },
  {
    _id: false
  }
);

const architectureSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
      index: true
    },
    services: {
      type: [architectureNodeSchema],
      default: []
    },
    apis: {
      type: [apiSchema],
      default: []
    },
    dependencies: {
      type: [dependencySchema],
      default: []
    },
    databaseInteractions: {
      type: [databaseInteractionSchema],
      default: []
    },
    fileTree: {
      type: [fileTreeNodeSchema],
      default: []
    },
    summary: {
      totalFiles: {
        type: Number,
        default: 0
      },
      totalDirectories: {
        type: Number,
        default: 0
      },
      middlewareCount: {
        type: Number,
        default: 0
      }
    }
  },
  {
    timestamps: true
  }
);

architectureSchema.index({ createdAt: -1 });
architectureSchema.index({ "summary.totalFiles": -1 });

module.exports = mongoose.model("Architecture", architectureSchema);
