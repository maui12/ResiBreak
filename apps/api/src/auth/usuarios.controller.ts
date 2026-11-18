import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Rol, Roles } from '../common/roles.js';
import { ActualizarUsuarioDto, CrearUsuarioDto } from './dto/usuario.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Roles(Rol.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuarios.crear(dto);
  }

  @Get()
  listar() {
    return this.usuarios.listar();
  }

  /** Activar/desactivar la cuenta o restablecer la contraseña. */
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUsuarioDto) {
    return this.usuarios.actualizar(id, dto);
  }
}