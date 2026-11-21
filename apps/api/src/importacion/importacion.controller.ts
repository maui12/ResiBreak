import { BadRequestException, Body, Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Rol, Roles } from '../common/roles.js';
import { ConfirmarImportacionDto } from './dto/importacion.dto.js';
import { ImportacionService } from './importacion.service.js';

/** Tamaño máximo del Excel. Un archivo con 500 residentes pesa bastante menos de 1 MB. */
export const TAMANO_MAXIMO_ARCHIVO = 2 * 1024 * 1024;

/** Lo que entrega Multer (almacenamiento en memoria: el archivo nunca se escribe en disco). */
interface ArchivoSubido {
  originalname: string;
  size: number;
  buffer: Buffer;
}

/** Carga de residentes nuevos desde Excel. Ver README.md de esta carpeta. */
@Roles(Rol.ADMIN)
@Controller('becados/importar')
export class ImportacionController {
  constructor(private readonly importacion: ImportacionService) {}

  /**
   * POST /api/becados/importar/vista-previa  (multipart/form-data, campo "archivo")
   * Lee el Excel y responde qué residentes y especialidades son nuevos. No guarda nada.
   */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  @Post('vista-previa')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_ARCHIVO, files: 1 } }))
  vistaPrevia(@UploadedFile() archivo?: ArchivoSubido) {
    if (!archivo?.buffer?.length) {
      throw new BadRequestException('Adjunta el archivo Excel en el campo "archivo"');
    }
    return this.importacion.vistaPrevia(archivo.buffer, archivo.originalname ?? '');
  }

  /**
   * POST /api/becados/importar/confirmar  { residentes: [{ rut, nombre, especialidad, correo? }] }
   * Crea las fichas y las cuentas de residente (todo o nada).
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('confirmar')
  confirmar(@Body() dto: ConfirmarImportacionDto) {
    return this.importacion.confirmar(dto);
  }
}
