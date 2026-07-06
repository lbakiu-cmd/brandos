import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FastifyReply } from "fastify";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload: ErrorResponse = {
      error: {
        code: this.getCode(exception, statusCode),
        message: this.getMessage(exception, statusCode),
        statusCode,
      },
    };

    void response.status(statusCode).send(payload);
  }

  private getCode(exception: unknown, statusCode: number) {
    if (exception instanceof HttpException) {
      return exception.constructor.name;
    }

    return statusCode === HttpStatus.INTERNAL_SERVER_ERROR
      ? "InternalServerError"
      : "ApiError";
  }

  private getMessage(exception: unknown, statusCode: number) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === "string") {
        return response;
      }

      if (response && typeof response === "object" && "message" in response) {
        const message = response.message;
        return Array.isArray(message) ? message.join("; ") : String(message);
      }
    }

    return statusCode === HttpStatus.INTERNAL_SERVER_ERROR
      ? "Internal server error"
      : "Request failed";
  }
}
