import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = this.extraerMensaje(exception);

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
    });
  }

  /**
   * exception.getResponse() de un HttpException "simple" (ej. `throw new
   * ForbiddenException('texto')`) devuelve el string tal cual, pero el
   * BadRequestException que arma el ValidationPipe automáticamente devuelve
   * un OBJETO `{ statusCode, message: string[], error }` — sin desarmarlo
   * acá, `message` termina siendo ese objeto entero. El frontend construye
   * `new Error(objeto)`, y el constructor de Error stringifica cualquier
   * cosa que no sea string con `String()` — de un objeto da literalmente
   * "[object Object]", que es lo que terminaba viendo el usuario en pantalla
   * ante cualquier error de validación (ej. contraseña muy corta al crear
   * un usuario).
   */
  private extraerMensaje(exception: unknown): string | string[] {
    if (!(exception instanceof HttpException)) return 'Error interno';
    const cuerpo = exception.getResponse();
    if (typeof cuerpo === 'string') return cuerpo;
    if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
      const mensaje = (cuerpo as { message: unknown }).message;
      if (typeof mensaje === 'string' || Array.isArray(mensaje)) return mensaje as string | string[];
    }
    return exception.message;
  }
}
