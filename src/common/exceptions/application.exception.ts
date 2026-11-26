

abstract class ApplicationException extends Error {
  constructor(override message: string, public status: number,override cause?: unknown) {
    super(message, { cause })
    this.name = this.constructor.name
  }
}

export class BadRequestException extends ApplicationException {
  constructor(message: string = "Bad request", cause?: unknown) {
    super(message, 400, cause)
  }
}
export class NotFoundException extends ApplicationException {
  constructor(message: string = "Not found", cause?: unknown) {
    super(message, 404, cause)
  }
}
export class ForbiddenException extends ApplicationException {
  constructor(message: string = "Forbidden", cause?: unknown) {
    super(message, 403, cause)
  }
}
export class ConflictException extends ApplicationException {
  constructor(message: string = "Conflict", cause?: unknown) {
    super(message, 409, cause)
  }
}

export class UnAuthorizedException extends ApplicationException {
  constructor(message: string = "UnAuthorized", cause?: unknown) {
    super(message, 401, cause)
  }

}