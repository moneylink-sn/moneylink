/**
 * MoneyLink — Middleware de Validation Zod
 */

export function validate(schema) {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (err) {
      if (err.errors) {
        return res.status(400).json({
          success: false,
          error: 'Validation échouée',
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Données de requête invalides'
      });
    }
  };
}
