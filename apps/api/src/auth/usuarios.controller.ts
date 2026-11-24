import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Rol, Roles } from '../common/roles.js';
import { UsuarioActual } from '../common/usuario-actual.js';
import { ActualizarUsuarioDto, CrearResidenteDto, CrearUsuarioDto, ListarUsuariosQueryDto } from './dto/usuario.dto.js';
import type { JwtPayload } from './jwt-payload.js';
import { UsuariosService } from './usuarios.service.js';

/** Administrar usuarios (solo admin). Pantallas: web /admin/usuarios y móvil admin/usuarios. */
@Roles(Rol.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** Crea una cuenta de administrador, consulta o proveedor (o la de un residente con ficha ya creada). */
  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuarios.crear(dto);
  }

  /** Alta manual de un residente: { nombre, rut, especialidad, email } => ficha + cuenta. */
  @Post('residentes')
  crearResidente(@Body() dto: CrearResidenteDto) {
    return this.usuarios.crearResidente(dto);
  }

  /** ?tipo=residentes | administradores (incluye consulta) | proveedores. Sin tipo: todas. */
  @Get()
  listar(@Query() q: ListarUsuariosQueryDto) {
    return this.usuarios.listar(q.tipo);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.obtener(id);
  }

  /** Editar nombre, correo, especialidad (residentes), rol (admin <-> consulta), activo o contraseña. */
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() actual: JwtPayload,
  ) {
    return this.usuarios.actualizar(id, dto, actual.sub);
  }
}
