export interface Usuario {
  idUsuario: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface Proveedor {
  idProveedor: number;
  nit: string;
  razonSocial: string;
  contactoCorreo: string;
  contactoTelefono: string;
  capacidadSemanal: number;
  estado: string;
  razonRechazo?: string;
  fechaRegistro: string;
}

export interface Producto {
  idProducto: number;
  idProveedor: number;
  nombre: string;
  categoria: string;
  unidadMedida: string;
  tempMinC: number;
  tempMaxC: number;
  stockMinimo: number;
  precioUnitario: number;
  activo: boolean;
}

export interface Lote {
  idLote: number;
  idProducto: number;
  nombreProducto: string;
  idProveedor: number;
  numeroLote: string;
  cantidadActual: number;
  fechaIngreso: string;
  fechaVencimiento: string;
  estado: string;
}

export interface Pedido {
  idPedido: number;
  idCliente: number;
  razonSocialCliente: string;
  estado: string;
  fechaPedido: string;
  fechaEntregaReq: string;
  total: number;
}

export interface Ruta {
  idRuta: number;
  idVehiculo: number;
  placaVehiculo: string;
  idConductor: number;
  nombreConductor: string;
  fechaRuta: string;
  estado: string;
}

export interface Factura {
  idFactura: number;
  idPedido: number;
  numeroFactura: string;
  total: number;
  estado: string;
  metodoPago: string;
  referenciaPago?: string;
  fechaEmision: string;
  fechaPago?: string;
}

export interface Alerta {
  idAlerta: number;
  tipo: string;
  severidad: string;
  mensaje: string;
  reconocida: boolean;
  fechaAlerta: string;
  idVehiculo?: number;
  idProducto?: number;
}

export interface Mantenimiento {
  idMantenimiento: number;
  idVehiculo: number;
  placaVehiculo: string;
  tipo: string;
  descripcion: string;
  kmEnServicio: number;
  fechaServicio: string;
  proxKm?: number;
  proxFecha?: string;
}

export interface Vehiculo {
  idVehiculo: number;
  placa?: string;
  nombre?: string;
  marca?: string;
  modelo?: string;
  capacidadKg?: number;
  kilometraje?: number;
  disponible?: boolean;
  ciudad?: string;
}
