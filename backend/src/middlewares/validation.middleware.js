function validate(schema, source = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      context: {
        request: req
      }
    });

    if (error) {
      const validationError = new Error("Validation failed");
      validationError.statusCode = 400;
      validationError.details = error.details.map((detail) => detail.message);
      return next(validationError);
    }

    req[source] = value;
    next();
  };
}

module.exports = validate;
