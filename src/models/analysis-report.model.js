const mongoose = require("mongoose");

const ruleBreakdownSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      default: 0
    },
    passed: {
      type: Boolean,
      default: true
    },
    impact: {
      type: Number,
      default: 0
    },
    message: {
      type: String,
      default: null
    },
    triggered: {
      type: Boolean,
      default: false
    },
    scoreImpact: {
      type: Number,
      default: 0
    },
    ruleId: {
      type: String,
      required: true
    },
    issues: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    }
  },
  {
    _id: false
  }
);

const categoryBreakdownSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      default: 100
    },
    weight: {
      type: Number,
      default: 1
    },
    totalImpact: {
      type: Number,
      default: 0
    },
    passedRules: {
      type: Number,
      default: 0
    },
    triggeredRules: {
      type: Number,
      default: 0
    },
    totalRules: {
      type: Number,
      default: 0
    },
    rules: {
      type: [ruleBreakdownSchema],
      default: []
    }
  },
  {
    _id: false
  }
);

const analysisIssueSchema = new mongoose.Schema(
  {
    category: String,
    severity: String,
    title: String,
    description: String,
    file: String,
    recommendation: String,
    ruleId: String
  },
  {
    _id: false
  }
);

const analysisReportSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
      index: true
    },
    score: Number,
    security: Number,
    performance: Number,
    scalability: Number,
    reliability: Number,
    summary: {
      type: String,
      default: ""
    },
    topIssues: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    issues: {
      type: [analysisIssueSchema],
      default: []
    },
    results: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    breakdown: {
      security: {
        type: categoryBreakdownSchema,
        default: () => ({})
      },
      performance: {
        type: categoryBreakdownSchema,
        default: () => ({})
      },
      scalability: {
        type: categoryBreakdownSchema,
        default: () => ({})
      },
      reliability: {
        type: categoryBreakdownSchema,
        default: () => ({})
      }
    }
  },
  {
    timestamps: true
  }
);

analysisReportSchema.index({ createdAt: -1 });
analysisReportSchema.index({ score: -1 });
analysisReportSchema.index({ security: 1, performance: 1, scalability: 1, reliability: 1 });
analysisReportSchema.index({ "issues.category": 1, "issues.severity": 1 });

module.exports = mongoose.model("AnalysisReport", analysisReportSchema);
