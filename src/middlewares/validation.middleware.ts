import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // Assign parsed values back to requests to preserve type-cast/transformed values
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => {
          // Remove the first element of path (which is 'body', 'query', or 'params')
          const field = err.path.slice(1).join('.');
          const location = err.path[0];
          return {
            location,
            field: field || undefined,
            message: err.message,
          };
        });
        
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors,
        });
        return;
      }
      next(error);
    }
  };
};
