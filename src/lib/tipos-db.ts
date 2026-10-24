export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      auditoria: {
        Row: {
          accion: string
          antes: Json | null
          created_at: string
          despues: Json | null
          id: string
          registro_id: string | null
          tabla: string
          updated_at: string
          usuario_id: string | null
          usuario_nombre: string | null
        }
        Insert: {
          accion: string
          antes?: Json | null
          created_at?: string
          despues?: Json | null
          id?: string
          registro_id?: string | null
          tabla: string
          updated_at?: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Update: {
          accion?: string
          antes?: Json | null
          created_at?: string
          despues?: Json | null
          id?: string
          registro_id?: string | null
          tabla?: string
          updated_at?: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'auditoria_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      categorias_egreso: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          created_at: string
          id: string
          tope_confirmacion: number
          unica: boolean
          updated_at: string
          whatsapp_dueno: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          tope_confirmacion?: number
          unica?: boolean
          updated_at?: string
          whatsapp_dueno?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          tope_confirmacion?: number
          unica?: boolean
          updated_at?: string
          whatsapp_dueno?: string | null
        }
        Relationships: []
      }
      egresos: {
        Row: {
          anulado: boolean
          anulado_en: string | null
          anulado_por: string | null
          categoria_id: string
          created_at: string
          descripcion: string
          fecha: string
          id: string
          medio_pago: Database['public']['Enums']['medio_pago']
          monto: number
          motivo_anulacion: string | null
          proveedor: string | null
          registrado_por: string
          salida_caja_id: string | null
          updated_at: string
        }
        Insert: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          categoria_id: string
          created_at?: string
          descripcion: string
          fecha: string
          id?: string
          medio_pago: Database['public']['Enums']['medio_pago']
          monto: number
          motivo_anulacion?: string | null
          proveedor?: string | null
          registrado_por?: string
          salida_caja_id?: string | null
          updated_at?: string
        }
        Update: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          categoria_id?: string
          created_at?: string
          descripcion?: string
          fecha?: string
          id?: string
          medio_pago?: Database['public']['Enums']['medio_pago']
          monto?: number
          motivo_anulacion?: string | null
          proveedor?: string | null
          registrado_por?: string
          salida_caja_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'egresos_anulado_por_fkey'
            columns: ['anulado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'egresos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias_egreso'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'egresos_registrado_por_fkey'
            columns: ['registrado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'egresos_salida_caja_id_fkey'
            columns: ['salida_caja_id']
            isOneToOne: false
            referencedRelation: 'salidas_caja'
            referencedColumns: ['id']
          },
        ]
      }
      jornadas: {
        Row: {
          abierta_en: string
          abierta_por: string
          cerrada_en: string | null
          cerrada_por: string | null
          created_at: string
          diferencia_efectivo: number | null
          efectivo_contado: number | null
          estado: Database['public']['Enums']['estado_jornada']
          fecha: string
          fondo_inicial: number
          id: string
          nota_cierre: string | null
          updated_at: string
        }
        Insert: {
          abierta_en?: string
          abierta_por: string
          cerrada_en?: string | null
          cerrada_por?: string | null
          created_at?: string
          diferencia_efectivo?: number | null
          efectivo_contado?: number | null
          estado?: Database['public']['Enums']['estado_jornada']
          fecha: string
          fondo_inicial?: number
          id?: string
          nota_cierre?: string | null
          updated_at?: string
        }
        Update: {
          abierta_en?: string
          abierta_por?: string
          cerrada_en?: string | null
          cerrada_por?: string | null
          created_at?: string
          diferencia_efectivo?: number | null
          efectivo_contado?: number | null
          estado?: Database['public']['Enums']['estado_jornada']
          fecha?: string
          fondo_inicial?: number
          id?: string
          nota_cierre?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'jornadas_abierta_por_fkey'
            columns: ['abierta_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'jornadas_cerrada_por_fkey'
            columns: ['cerrada_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          created_at: string
          debe_cambiar_clave: boolean
          email: string | null
          id: string
          nombre: string
          rol: Database['public']['Enums']['rol_usuario']
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          debe_cambiar_clave?: boolean
          email?: string | null
          id: string
          nombre: string
          rol?: Database['public']['Enums']['rol_usuario']
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          debe_cambiar_clave?: boolean
          email?: string | null
          id?: string
          nombre?: string
          rol?: Database['public']['Enums']['rol_usuario']
          updated_at?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          precio: number | null
          unidad: Database['public']['Enums']['unidad_producto']
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          precio?: number | null
          unidad?: Database['public']['Enums']['unidad_producto']
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          precio?: number | null
          unidad?: Database['public']['Enums']['unidad_producto']
          updated_at?: string
        }
        Relationships: []
      }
      salidas_caja: {
        Row: {
          anulada: boolean
          anulada_en: string | null
          anulada_por: string | null
          created_at: string
          detalle: string | null
          id: string
          importe: number
          jornada_id: string
          motivo: Database['public']['Enums']['motivo_salida']
          motivo_anulacion: string | null
          registrada_en: string
          registrada_por: string
          updated_at: string
        }
        Insert: {
          anulada?: boolean
          anulada_en?: string | null
          anulada_por?: string | null
          created_at?: string
          detalle?: string | null
          id?: string
          importe: number
          jornada_id: string
          motivo: Database['public']['Enums']['motivo_salida']
          motivo_anulacion?: string | null
          registrada_en?: string
          registrada_por: string
          updated_at?: string
        }
        Update: {
          anulada?: boolean
          anulada_en?: string | null
          anulada_por?: string | null
          created_at?: string
          detalle?: string | null
          id?: string
          importe?: number
          jornada_id?: string
          motivo?: Database['public']['Enums']['motivo_salida']
          motivo_anulacion?: string | null
          registrada_en?: string
          registrada_por?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'salidas_caja_anulada_por_fkey'
            columns: ['anulada_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'salidas_caja_jornada_id_fkey'
            columns: ['jornada_id']
            isOneToOne: false
            referencedRelation: 'jornadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'salidas_caja_registrada_por_fkey'
            columns: ['registrada_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      ventas: {
        Row: {
          anulada: boolean
          anulada_en: string | null
          anulada_por: string | null
          cantidad: number | null
          created_at: string
          id: string
          importe: number
          jornada_id: string
          medio_pago: Database['public']['Enums']['medio_pago']
          motivo_anulacion: string | null
          precio_unitario: number | null
          producto_id: string
          registrada_en: string
          registrada_por: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          anulada?: boolean
          anulada_en?: string | null
          anulada_por?: string | null
          cantidad?: number | null
          created_at?: string
          id?: string
          importe: number
          jornada_id: string
          medio_pago: Database['public']['Enums']['medio_pago']
          motivo_anulacion?: string | null
          precio_unitario?: number | null
          producto_id: string
          registrada_en?: string
          registrada_por: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          anulada?: boolean
          anulada_en?: string | null
          anulada_por?: string | null
          cantidad?: number | null
          created_at?: string
          id?: string
          importe?: number
          jornada_id?: string
          medio_pago?: Database['public']['Enums']['medio_pago']
          motivo_anulacion?: string | null
          precio_unitario?: number | null
          producto_id?: string
          registrada_en?: string
          registrada_por?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ventas_anulada_por_fkey'
            columns: ['anulada_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ventas_jornada_id_fkey'
            columns: ['jornada_id']
            isOneToOne: false
            referencedRelation: 'jornadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ventas_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ventas_registrada_por_fkey'
            columns: ['registrada_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_jornada: {
        Args: { p_fondo_inicial?: number }
        Returns: {
          abierta_en: string
          abierta_por: string
          cerrada_en: string | null
          cerrada_por: string | null
          created_at: string
          diferencia_efectivo: number | null
          efectivo_contado: number | null
          estado: Database['public']['Enums']['estado_jornada']
          fecha: string
          fondo_inicial: number
          id: string
          nota_cierre: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'jornadas'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      anular_salida: {
        Args: { p_salida_id: string; p_motivo: string }
        Returns: {
          anulada: boolean
          anulada_en: string | null
          anulada_por: string | null
          created_at: string
          detalle: string | null
          id: string
          importe: number
          jornada_id: string
          motivo: Database['public']['Enums']['motivo_salida']
          motivo_anulacion: string | null
          registrada_en: string
          registrada_por: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'salidas_caja'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      anular_ticket: {
        Args: { p_ticket_id: string; p_motivo: string }
        Returns: {
          anulada: boolean
          anulada_en: string | null
          anulada_por: string | null
          cantidad: number | null
          created_at: string
          id: string
          importe: number
          jornada_id: string
          medio_pago: Database['public']['Enums']['medio_pago']
          motivo_anulacion: string | null
          precio_unitario: number | null
          producto_id: string
          registrada_en: string
          registrada_por: string
          ticket_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'ventas'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      anular_venta: {
        Args: { p_venta_id: string; p_motivo: string }
        Returns: {
          anulada: boolean
          anulada_en: string | null
          anulada_por: string | null
          cantidad: number | null
          created_at: string
          id: string
          importe: number
          jornada_id: string
          medio_pago: Database['public']['Enums']['medio_pago']
          motivo_anulacion: string | null
          precio_unitario: number | null
          producto_id: string
          registrada_en: string
          registrada_por: string
          ticket_id: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'ventas'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cerrar_jornada: {
        Args: { p_jornada_id: string; p_efectivo_contado: number; p_nota?: string }
        Returns: {
          abierta_en: string
          abierta_por: string
          cerrada_en: string | null
          cerrada_por: string | null
          created_at: string
          diferencia_efectivo: number | null
          efectivo_contado: number | null
          estado: Database['public']['Enums']['estado_jornada']
          fecha: string
          fondo_inicial: number
          id: string
          nota_cierre: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'jornadas'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      egresos_por_categoria: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          categoria_id: string
          categoria: string
          total: number
          cantidad: number
        }[]
      }
      es_admin: {
        Args: never
        Returns: boolean
      }
      exigir_admin: {
        Args: never
        Returns: undefined
      }
      exigir_usuario_activo: {
        Args: never
        Returns: undefined
      }
      facturacion_agrupada: {
        Args: { p_desde: string; p_hasta: string; p_unidad: string }
        Returns: {
          periodo: string
          total: number
          total_efectivo: number
          total_mercadopago: number
          cantidad_tickets: number
          dias_trabajados: number
        }[]
      }
      facturacion_por_dia: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          fecha: string
          trabajado: boolean
          total: number
          total_efectivo: number
          total_mercadopago: number
          cantidad_tickets: number
          kilos: number
        }[]
      }
      hoy_ar: {
        Args: never
        Returns: string
      }
      hoy_contra_semana_pasada: {
        Args: never
        Returns: {
          hoy: number
          semana_pasada_a_esta_hora: number
          semana_pasada_total: number
          hubo_caja_semana_pasada: boolean
        }[]
      }
      ingresos_egresos_mensual: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          mes: string
          ingresos: number
          egresos: number
          ganancia: number
        }[]
      }
      marcar_clave_cambiada: {
        Args: never
        Returns: undefined
      }
      planilla_jornada: {
        Args: { p_jornada_id: string }
        Returns: {
          producto_id: string
          nombre: string
          unidad: Database['public']['Enums']['unidad_producto']
          orden: number
          cantidad: number
          total: number
          total_efectivo: number
          total_mercadopago: number
          ventas: number
        }[]
      }
      planilla_periodo: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          producto_id: string
          nombre: string
          unidad: Database['public']['Enums']['unidad_producto']
          orden: number
          cantidad: number
          total: number
          total_efectivo: number
          total_mercadopago: number
          ventas: number
        }[]
      }
      reabrir_jornada: {
        Args: { p_jornada_id: string }
        Returns: {
          abierta_en: string
          abierta_por: string
          cerrada_en: string | null
          cerrada_por: string | null
          created_at: string
          diferencia_efectivo: number | null
          efectivo_contado: number | null
          estado: Database['public']['Enums']['estado_jornada']
          fecha: string
          fondo_inicial: number
          id: string
          nota_cierre: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'jornadas'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_salida: {
        Args: {
          p_importe: number
          p_motivo: Database['public']['Enums']['motivo_salida']
          p_detalle?: string
        }
        Returns: {
          anulada: boolean
          anulada_en: string | null
          anulada_por: string | null
          created_at: string
          detalle: string | null
          id: string
          importe: number
          jornada_id: string
          motivo: Database['public']['Enums']['motivo_salida']
          motivo_anulacion: string | null
          registrada_en: string
          registrada_por: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'salidas_caja'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_ticket: {
        Args: { p_medio_pago: Database['public']['Enums']['medio_pago']; p_items: Json }
        Returns: {
          anulada: boolean
          anulada_en: string | null
          anulada_por: string | null
          cantidad: number | null
          created_at: string
          id: string
          importe: number
          jornada_id: string
          medio_pago: Database['public']['Enums']['medio_pago']
          motivo_anulacion: string | null
          precio_unitario: number | null
          producto_id: string
          registrada_en: string
          registrada_por: string
          ticket_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'ventas'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      resumen_jornada: {
        Args: { p_jornada_id: string }
        Returns: {
          jornada_id: string
          fecha: string
          estado: Database['public']['Enums']['estado_jornada']
          total: number
          total_efectivo: number
          total_mercadopago: number
          cantidad_tickets: number
          cantidad_efectivo: number
          cantidad_mercadopago: number
          cantidad_anuladas: number
          ticket_promedio: number
          kilos: number
          fondo_inicial: number
          total_salidas: number
          cantidad_salidas: number
          efectivo_esperado: number
          efectivo_contado: number
          diferencia_efectivo: number
        }[]
      }
      resumen_periodo: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          desde: string
          hasta: string
          total: number
          total_efectivo: number
          total_mercadopago: number
          cantidad_tickets: number
          ticket_promedio: number
          kilos: number
          dias_trabajados: number
          promedio_diario: number
          diferencia_caja: number
          mejor_dia: string
          mejor_dia_total: number
        }[]
      }
      usuario_activo: {
        Args: never
        Returns: boolean
      }
      ventas_por_dia_semana: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          dia_semana: number
          dias_trabajados: number
          total: number
          promedio: number
        }[]
      }
      ventas_por_hora: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          hora: number
          dias_trabajados: number
          promedio_total: number
          promedio_tickets: number
        }[]
      }
    }
    Enums: {
      estado_jornada: 'abierta' | 'cerrada'
      medio_pago: 'efectivo' | 'mercadopago'
      motivo_salida: 'proveedor' | 'retiro' | 'gasto' | 'otro'
      rol_usuario: 'cajero' | 'admin'
      unidad_producto: 'kg' | 'unidad'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export const Constants = {
  public: {
    Enums: {
      estado_jornada: ['abierta', 'cerrada'],
      medio_pago: ['efectivo', 'mercadopago'],
      motivo_salida: ['proveedor', 'retiro', 'gasto', 'otro'],
      rol_usuario: ['cajero', 'admin'],
      unidad_producto: ['kg', 'unidad'],
    },
  },
} as const
