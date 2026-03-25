const Project = require("../models/project.model");
const Architecture = require("../models/architecture.model");
const AnalysisReport = require("../models/analysis-report.model");
const { mapToCarView } = require("./car-mapping.service");

async function persistAnalysis(result) {
  const project = await Project.create({
    name: result.projectName,
    sourceType: result.sourceType,
    sourceLocation: result.sourceLocation,
    lastAnalyzedAt: new Date(),
    metadata: {
      totalFiles: result.architecture.summary.totalFiles,
      totalDirectories: result.architecture.summary.totalDirectories,
      detectedLanguage: result.analysisReport.metadata?.detectedLanguage || "Unknown"
    }
  });

  const architecture = await Architecture.create({
    projectId: project._id,
    ...result.architecture
  });

  const analysisReport = await AnalysisReport.create({
    projectId: project._id,
    ...result.analysisReport
  });

  project.architectureId = architecture._id;
  project.analysisReportId = analysisReport._id;
  await project.save();

  return project;
}

async function getProjectById(projectId) {
  const project = await Project.findById(projectId).lean();

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  return project;
}

async function getArchitectureByProjectId(projectId) {
  await getProjectById(projectId);
  const architecture = await Architecture.findOne({ projectId }).lean();

  if (!architecture) {
    const error = new Error("Architecture not found");
    error.statusCode = 404;
    throw error;
  }

  return architecture;
}

async function getAnalysisByProjectId(projectId) {
  await getProjectById(projectId);
  const report = await AnalysisReport.findOne({ projectId }).lean();

  if (!report) {
    const error = new Error("Analysis report not found");
    error.statusCode = 404;
    throw error;
  }

  return report;
}

async function getCarViewByProjectId(projectId) {
  const report = await getAnalysisByProjectId(projectId);

  return mapToCarView(report);
}

module.exports = {
  persistAnalysis,
  getArchitectureByProjectId,
  getAnalysisByProjectId,
  getCarViewByProjectId
};
