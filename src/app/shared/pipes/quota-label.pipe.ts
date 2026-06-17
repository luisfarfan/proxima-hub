import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'quotaLabel', standalone: true, pure: true })
export class QuotaLabelPipe implements PipeTransform {
  private static readonly LABELS: Record<string, string> = {
    max_users: 'Usuarios',
    users: 'Usuarios',
    storage_mb: 'Almacenamiento',
    orders_per_month: 'Pedidos / mes',
    invoices_per_month: 'Comprobantes / mes',
    max_products: 'Productos',
    products: 'Productos',
    max_orders: 'Pedidos / mes',
  };

  transform(key: string): string {
    return QuotaLabelPipe.LABELS[key] ?? key;
  }
}
