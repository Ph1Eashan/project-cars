const repositoryAnalysisService = require("../services/repository-analysis.service");
const projectService = require("../services/project.service");
const { asyncHandler } = require("../utils/async-handler");

const analyzeRepository = asyncHandler(async (req, res) => {
  const { repoUrl } = req.body;
  const zipFile = req.file;

  const result = await repositoryAnalysisService.analyzeSource({
    repoUrl,
    zipFile
  });

  const project = await projectService.persistAnalysis(result);

  res.status(201).json({
    message: "Repository analyzed successfully",
    projectId: project._id,
    architectureId: project.architectureId,
    analysisReportId: project.analysisReportId
  });
});

const getArchitecture = asyncHandler(async (req, res) => {
  const architecture = await projectService.getArchitectureByProjectId(req.params.id);

  res.status(200).json(architecture);
});

const getAnalysis = asyncHandler(async (req, res) => {
  const report = await projectService.getAnalysisByProjectId(req.params.id);

  res.status(200).json(report);
});

const getCarView = asyncHandler(async (req, res) => {
  const carView = await projectService.getCarViewByProjectId(req.params.id);

  res.status(200).json(carView);
});

module.exports = {
  analyzeRepository,
  getArchitecture,
  getAnalysis,
  getCarView
};
