import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Ne jamais renvoyer codes Prisma / stack au client (anti-fuite).
 * P2002 => 409 générique, P2025/P2023 => 404, reste => 500 générique.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    if (exception.code === 'P2002') {
      return res.status(HttpStatus.CONFLICT).json({ message: 'Conflit : ressource déjà existante' });
    }
    if (exception.code === 'P2025' || exception.code === 'P2023') {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Ressource non trouvée' });
    }
    this.logger.error(`Prisma ${exception.code} ${req.method} ${req.url}: ${exception.message}`);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Erreur interne' });
  }
}
