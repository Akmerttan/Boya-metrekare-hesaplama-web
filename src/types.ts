/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Piece {
  id: string;
  en: number; // Width in cm (e.g. 120 cm)
  boy: number; // Height in cm (e.g. 200 cm)
  adet: number; // Quantity
  alan: number; // Area of single piece in m² (en * boy / 10000)
  toplamAlan: number; // Total area for this line item in m² (alan * adet)
}

export interface Job {
  id: string;
  musteriAdi: string; // Customer name or Job name (Müşteri veya İş Adı)
  parcalar: Piece[];
  toplamMetrekare: number;
  birimFiyat: number; // Unit price per m²
  toplamTutar: number; // Total price (toplamMetrekare * birimFiyat)
  tarih: string; // Formatting timestamp
  notlar?: string; // Optional notes
}
