const Joi = require("joi");

const analyzeRepositorySchema = Joi.object({
  repoUrl: Joi.string().uri().optional().allow("", null)
}).custom((value, helpers) => {
  const hasRepoUrl = Boolean(value.repoUrl);
  const hasZip = Boolean(helpers?.prefs?.context?.request?.file);

  if (!hasRepoUrl && !hasZip) {
    return helpers.message("Either repoUrl or zipFile is required");
  }

  return value;
}, "repo source validation");

const projectIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

const simulationSchema = Joi.object({
  users: Joi.number().integer().min(1).required(),
  projectId: Joi.string().hex().length(24).optional()
});

module.exports = {
  analyzeRepositorySchema,
  projectIdParamSchema,
  simulationSchema
};
